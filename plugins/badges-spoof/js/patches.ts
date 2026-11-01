import { getModules } from '@valenced/modules/finders'
import { withName, withProps } from '@valenced/modules/finders/filters'
import { before, instead } from '@valenced/patcher'
import * as React from 'react'
import { StyleSheet, Text } from 'react-native'
import { badgeIdOf, catalogEntry, findBadge, isInGrid, isOurId, isRecord, moveBadge, withBadges, withCatalog } from './badges'
import {
	type BadgeDefinition,
	getVersion,
	isHidden,
	setHidden,
	setOrder,
	showsAll,
	status,
	subscribe,
} from './state'

type Cleanup = () => unknown
type Register = (...fns: Cleanup[]) => void
type GetStore = (name: string, callback: (store: any) => void) => () => void
type Original = (...args: any[]) => any
type Hook = (this: any, args: any[], original: Original) => any

const LEGACY_PREFIX = 'Legacy Badge\n'
const LEGACY_STYLE = { fontSize: 14, lineHeight: 17, color: '#9b94b0' }
const LEGACY_GAP_STYLE = { fontSize: 4, lineHeight: 4.5 }

// "Legacy Badge", a small gap, then the rest of the text.
const legacyParts = (rest: string) => [
	React.createElement(Text, { key: 'legacy', style: LEGACY_STYLE }, 'Legacy Badge'),
	'\n',
	React.createElement(Text, { key: 'legacy-gap', style: LEGACY_GAP_STYLE }, ' \n'),
	rest,
]

// Makes the badge row wrap onto more lines when there are more badges than fit.
const WRAP_STYLE = { flexWrap: 'wrap', rowGap: 4, flexShrink: 1 }

// Replaces `key` on `target`. A failure is shown in the settings and leaves the rest working.
function patchKey(target: any, key: string, hook: Hook, cleanup: Register, what: string) {
	try {
		cleanup(instead(target, key, hook))
		status(what, `${what}: patched`)
	} catch (e) {
		status(what, `${what}: could not patch ${key} (${(e as Error)?.message})`)
	}
}

const withoutOurs = (list: unknown) => (Array.isArray(list) ? list.filter(item => !isOurId(badgeIdOf(item))) : list)

export function applyPatches(getStore: GetStore, cleanup: Register) {
	// Only the current user's badges are changed. Everyone else's profile stays as it is.
	let userStore: any
	const currentUserId = (): string | undefined => {
		try {
			return userStore?.getCurrentUser?.()?.id
		} catch {
			return undefined
		}
	}

	status('current user', 'current user: waiting for Discord to load it')
	cleanup(
		getStore('UserStore', store => {
			userStore = store
			status('current user', 'current user: found')
		}),
	)

	// The hook that builds the badge list for a profile.
	status('useBadges hook', 'useBadges hook: waiting for Discord to load it')
	cleanup(
		getModules(
			withName('useBadges'),
			(module: any) => {
				if (typeof module?.default !== 'function') return

				patchKey(
					module,
					'default',
					function (this: any, args, original) {
						// Re-renders the profile when a badge is hidden or shown.
						React.useSyncExternalStore(subscribe, getVersion)

						const result = Reflect.apply(original, this, args)
						const userId = args[0]?.userId
						return Array.isArray(result) && userId && userId === currentUserId()
							? withBadges(result)
							: result
					},
					cleanup,
					'useBadges hook',
				)
			},
			{ returnNamespace: true, max: Number.POSITIVE_INFINITY },
		),
	)

	// The profile's badge row, found by the props it gets so it keeps working when Discord
	// renames its components. It gets `{ userId, badges, catalogBadges }`.
	status('profile badge row', 'profile badge row: waiting for it to be drawn')
	let rowSeen = false

	// The badge whose sheet was asked for last. While it is one of ours, the tagline word that
	// Discord fills in for your own badges ("Unlocked") is swapped for what it says on a profile
	// that is not yours. Any badge looked up after it, ours or not, ends this.
	let sheet: { badge: BadgeDefinition; at: number } | undefined
	const openSheet = (badge: BadgeDefinition | undefined) => {
		sheet = badge?.phrase || badge?.tiered ? { badge, at: Date.now() } : undefined
	}

	const swapSheetText = (children: unknown): unknown => {
		if (!sheet || Date.now() - sheet.at > 30_000) return children

		const { phrase, tiered } = sheet.badge
		const swap = (text: unknown) => {
			if (typeof text !== 'string') return text
			// "Your Progress" / "<name>'s Progress" on a tiered badge's sheet.
			if (tiered && /^(Your|.+['’]s) Progress$/.test(text)) return 'My Progress'
			return phrase && /^(.*\s•\s)?Unlocked$/.test(text) ? text.replace(/Unlocked$/, phrase) : text
		}

		// "Legacy Badge" on its own first line becomes the small dimmed label Discord uses.
		if (typeof children === 'string' && children.startsWith(LEGACY_PREFIX)) {
			return legacyParts(children.slice(LEGACY_PREFIX.length))
		}
		if (typeof children === 'string') return swap(children)
		if (Array.isArray(children)) {
			let changed = false
			const next = children.flatMap(child => {
				if (typeof child === 'string' && child.startsWith(LEGACY_PREFIX)) {
					changed = true
					return legacyParts(child.slice(LEGACY_PREFIX.length))
				}
				const value = swap(child)
				if (value !== child) changed = true
				return value
			})
			return changed ? next : children
		}

		return children
	}

	const typeName = (type: any): string =>
		type?.displayName ?? type?.name ?? type?.render?.name ?? type?.type?.name ?? 'unknown'

	// True if any of the children is one of our badges. Looks one list deeper for mapped lists.
	const holdsOurs = (children: unknown, depth = 0): boolean =>
		Array.isArray(children)
			? children.some(child =>
					Array.isArray(child) && depth < 2
						? holdsOurs(child, depth + 1)
						: isOurId(
								(child as any)?.props?.id ??
									(child as any)?.props?.badgeId ??
									(child as any)?.props?.badge?.id ??
									(child as any)?.props?.badge?.badge_id ??
									(child as any)?.key,
							),
				)
			: false

	// Long-press menu on the edit profile screen: "Go Left" and "Go Right" are added under
	// "Hide Badge". They run Discord's own hide item, and the badge it asks to hide is moved
	// instead (see setPendingBadgeVisibility below).
	let menuUntil = 0
	let pendingMove: { delta: -1 | 1; at: number; token: number } | undefined
	let menuSeen = false
	let menuMissSeen = false

	const HIDE_ITEM = /^(un)?hide badge$/i
	const textKeys = ['label', 'title', 'text', 'actionTitle', 'children'] as const
	const handlerKeys = ['onPress', 'onSelect', 'onClick', 'action', 'onPressMenuItem'] as const

	const hasHandler = (item: any): boolean => {
		const source = React.isValidElement(item) ? (item as any).props : item
		return Boolean(source) && typeof source === 'object' && handlerKeys.some(key => typeof source[key] === 'function')
	}

	const textOf = (item: any): string | undefined => {
		const source = React.isValidElement(item) ? (item as any).props : item
		if (!source || typeof source !== 'object') return undefined
		for (const key of textKeys) if (typeof source[key] === 'string') return source[key]
		return undefined
	}

	const ARROW_STYLE = { fontSize: 20, color: '#b5bac1' }
	const arrow = (glyph: string, color?: string) =>
		React.createElement(Text, { style: color ? [ARROW_STYLE, { color }] : ARROW_STYLE }, glyph)

	// Takes the place of the hide item's eye icon, whichever way the menu was given it.
	const arrowFor = (value: unknown, glyph: string): unknown => {
		if (React.isValidElement(value)) return arrow(glyph)
		if (typeof value === 'function' || (isRecord(value) && (value as any).$$typeof)) {
			return (props: any) => arrow(glyph, props?.color)
		}
		return undefined
	}

	let lastMove = { id: '', at: 0 }
	const doMove = (id: string, delta: -1 | 1) => {
		const moved = moveBadge(id, delta)
		lastMove = { id, at: Date.now() }
		status(
			'badge menu move',
			moved
				? `badge menu: moved ${id} ${delta < 0 ? 'left' : 'right'}`
				: `badge menu: ${id} cannot go ${delta < 0 ? 'left' : 'right'} (end of the list, or not in it)`,
		)
	}

	let pressToken = 0
	const moveItem = (item: any, parent: any, label: string, delta: -1 | 1, suffix: string) => {
		const isElement = React.isValidElement(item)
		const source = isElement ? (item as any).props : item
		const changes: Record<string, unknown> = {}
		const glyph = delta < 0 ? '←' : '→'

		// The badge this menu is for, if the menu says so itself.
		const direct = (): string | undefined => {
			for (const holder of [source, parent]) {
				const id = badgeIdOf(holder?.badgeId ?? holder?.badge_id ?? holder?.badge?.badge_id ?? holder?.badge?.id)
				if (id && isInGrid(id)) return id
			}
			return undefined
		}

		for (const key of textKeys) if (typeof source[key] === 'string') changes[key] = label
		for (const key of handlerKeys) {
			const handler = source[key]
			if (typeof handler !== 'function') continue

			changes[key] = (...args: unknown[]) => {
				const known = direct()
				if (known) {
					doMove(known, delta)
					return
				}

				// Otherwise run Discord's hide item and move whichever badge it asks to hide.
				const token = ++pressToken
				pendingMove = { delta, at: Date.now(), token }
				setTimeout(() => {
					if (pendingMove?.token !== token) return
					pendingMove = undefined
					status('badge menu move', `badge menu: ${label} pressed, but Discord did not ask to hide a badge`)
				}, 1500)
				return handler(...args)
			}
		}

		for (const key of Object.keys(source)) {
			if (/icon|leading|trailing|accessory|image/i.test(key) && source[key] !== undefined) {
				changes[key] = arrowFor(source[key], glyph)
			}
		}
		for (const key of ['id', 'key', 'actionKey']) {
			if (typeof source[key] === 'string') changes[key] = `${source[key]}${suffix}`
		}

		return isElement
			? React.cloneElement(item, { ...changes, key: `${(item as any).key ?? 'item'}${suffix}` })
			: { ...item, ...changes }
	}

	const addMoveItems = (args: any[], props: any): any[] | undefined => {
		for (const key of ['items', 'options', 'actions', 'children']) {
			const list = props[key]
			if (!Array.isArray(list) || list.length > 12) continue

			const at = list.findIndex(item => hasHandler(item) && HIDE_ITEM.test(textOf(item) ?? ''))
			if (at < 0 || list.some(item => hasHandler(item) && textOf(item) === 'Go Left')) continue

			const item = list[at]
			const next = [
				...list.slice(0, at + 1),
				moveItem(item, props, 'Go Left', -1, '-left'),
				moveItem(item, props, 'Go Right', 1, '-right'),
				...list.slice(at + 1),
			]

			if (!menuSeen) {
				menuSeen = true
				status('badge menu', `badge menu: Go Left / Go Right added (${typeName(args[0])}.${key}; item: ${Object.entries(React.isValidElement(item) ? (item as any).props : item).map(([k, v]) => `${k}:${React.isValidElement(v) ? 'element' : typeof v}`).join(',')}; menu: ${Object.keys(props).join(',')})`)
			}
			return [args[0], { ...props, [key]: next }, ...args.slice(2)]
		}

		// The text is there but not in a list this code knows: report where, once.
		if (!menuMissSeen) {
			for (const key of Object.keys(props)) {
				const value = props[key]
				if (typeof value === 'string' && HIDE_ITEM.test(value)) {
					menuMissSeen = true
					status('badge menu', `badge menu: "Hide Badge" found in ${typeName(args[0])}.${key}, nothing added`)
				}
			}
		}

		return undefined
	}

	let wrapSeen = false
	let iconSeen = false

	const intercept = (args: any[]) => {
		try {
			const props = args[1]
			if (!props || typeof props !== 'object') return args

			// Only while the edit profile badge screen is likely open.
			if (Date.now() < menuUntil) {
				const withMenu = addMoveItems(args, props)
				if (withMenu) return withMenu
			}

			// The sheet of one of our badges: change the tagline word.
			if (sheet && props.children !== undefined) {
				const children = swapSheetText(props.children)
				if (children !== props.children) {
					return [args[0], { ...props, children }, ...args.slice(2)]
				}
			}

			// One of our badges being drawn: give it the sharp icon.
			const badge = findBadge(props.id ?? props.badgeId)
			if (badge && typeof args[0] !== 'string') {
				if (!iconSeen) {
					iconSeen = true
					status('badge icon', `badge icon: sharp icon used (${typeName(args[0])})`)
				}
				return [args[0], { ...props, source: { uri: badge.url } }, ...args.slice(2)]
			}

			// The row that holds our badges: let it wrap onto more lines instead of running off
			// the edge. Found by what it holds, so it works whichever component draws it. Only
			// horizontal rows are changed: wrapping a tile (icon above its label) would push the
			// icon to the left.
			if (showsAll() && typeof args[0] !== 'string' && holdsOurs(props.children)) {
				const flat: any = StyleSheet.flatten(props.style) ?? {}
				if (flat.flexDirection === 'row' && flat.flexWrap !== 'wrap') {
					if (!wrapSeen) {
						wrapSeen = true
						status('badge row wrap', `badge row wrap: wrapping (${typeName(args[0])})`)
					}
					return [args[0], { ...props, style: [props.style, WRAP_STYLE] }, ...args.slice(2)]
				}
			}

			if (typeof props.userId !== 'string') return args
			if (!Array.isArray(props.badges) || !props.badges.every(isRecord)) return args
			if (props.userId !== currentUserId()) return args

			if (!rowSeen) {
				rowSeen = true
				status('profile badge row', 'profile badge row: patched')
			}

			const next: Record<string, unknown> = { ...props, badges: withBadges(props.badges) }
			if (Array.isArray(props.catalogBadges)) {
				next.catalogBadges = withCatalog(props.catalogBadges, false)
				if (showsAll()) next.style = [props.style, WRAP_STYLE]
			}

			return [args[0], next, ...args.slice(2)]
		} catch {
			return args // a before-hook must return the args
		}
	}

	const safePatch = (target: any, key: string) => {
		try {
			cleanup(before(target, key, intercept))
		} catch {
			// Missing in this Discord version.
		}
	}

	safePatch(React, 'createElement')
	cleanup(
		getModules(withProps('jsx', 'jsxs'), (module: any) => {
			const target = module?.jsx ? module : module?.default
			for (const key of ['jsx', 'jsxs', 'jsxDEV']) {
				if (typeof target?.[key] === 'function') safePatch(target, key)
			}
		}),
	)

	// The badge list on the edit profile screen ("Customise your badges").
	status('badge list', 'badge list: waiting for Discord to load it')
	cleanup(
		getStore('BadgeDirectoryStore', directory => {
			patchKey(
				directory,
				'getBadges',
				function (this: any, args, original) {
					const result = Reflect.apply(original, this, args)
					const userId = args[0] ?? currentUserId()
					if (!Array.isArray(result) || !userId) return result

					// Only your own list is changed.
					if (userId !== currentUserId()) return result

					menuUntil = Date.now() + 10 * 60_000
					return withCatalog(result, true)
				},
				cleanup,
				'badge list',
			)

			patchKey(
				directory,
				'getBadgeById',
				function (this: any, args, original) {
					const badge = findBadge(args[0])
					openSheet(badge)
					return badge ? catalogEntry(badge) : Reflect.apply(original, this, args)
				},
				cleanup,
				'badge list',
			)

			// Redraws the list when a badge is hidden or shown.
			cleanup(
				subscribe(() => {
					try {
						directory.emitChange()
					} catch {
						// Nothing to redraw.
					}
				}),
			)
		}),
	)

	// Long-press > "Hide Badge" / "Unhide Badge" on the edit profile screen. Our badges are
	// hidden on this device only. Discord must never send their ids to its servers, so they
	// are taken out of everything it is about to save.
	status('hide and show', 'hide and show: waiting for Discord to load it')
	let lastToggle = { id: '', at: 0 }

	cleanup(
		getModules(withProps('setPendingBadgeDisplayOrder', 'setPendingBadgeVisibility'), (module: any) => {
			patchKey(
				module,
				'setPendingBadgeDisplayOrder',
				function (this: any, args, original) {
					const order = args[0]
					if (!Array.isArray(order)) return Reflect.apply(original, this, args)

					// The new order, real and added badges together, is kept on this device.
					const ids = order.map(badgeIdOf).filter((id): id is string => Boolean(id))
					if (ids.length > 1) {
						setOrder(ids)
						status('badge order', `badge order: saved ${ids.length} (${ids.slice(0, 3).join(', ')}...)`)
					}

					// Discord only gets the real badges, in the order they now have.
					return Reflect.apply(original, this, [
						ids.some(id => isOurId(id)) ? withoutOurs(order) : order,
						...args.slice(1),
					])
				},
				cleanup,
				'hide and show',
			)

			patchKey(
				module,
				'setPendingBadgeVisibility',
				function (this: any, args, original) {
					const options = args[0]
					if (!isRecord(options)) return Reflect.apply(original, this, args)

					// "Go Left" / "Go Right" ran the hide item: move the badge instead of hiding it.
					const asked = badgeIdOf(options.badgeId)
					if (pendingMove && Date.now() - pendingMove.at < 1500) {
						const { delta } = pendingMove
						pendingMove = undefined
						if (asked) doMove(asked, delta)
						return
					}

					// A repeat of the same request right after a move is not a hide.
					if (asked && asked === lastMove.id && Date.now() - lastMove.at < 800) return

					const badge = findBadge(options.badgeId)
					if (badge) {
						// The menu item flips the badge. A repeated call a moment later is ignored.
						const now = Date.now()
						if (lastToggle.id === badge.id && now - lastToggle.at < 300) return

						lastToggle = { id: badge.id, at: now }
						setHidden(badge.key, !isHidden(badge.key))
						return
					}

					const clean: Record<string, unknown> = { ...options }
					for (const key of ['reorderableBadgeIds', 'hiddenBadgeIds']) {
						if (Array.isArray(options[key])) clean[key] = withoutOurs(options[key])
					}

					return Reflect.apply(original, this, [clean, ...args.slice(1)])
				},
				cleanup,
				'hide and show',
			)
		}),
	)

	// Discord looks badge ids up by their number or name, which our ids don't have.
	status('badge ids', 'badge ids: waiting for Discord to load it')
	cleanup(
		getModules(withProps('resolveProfileBadgeId', 'toProfileBadgeLegacyId'), (module: any) => {
			for (const key of ['resolveProfileBadgeId', 'toProfileBadgeLegacyId']) {
				patchKey(
					module,
					key,
					function (this: any, args, original) {
						return isOurId(args[0]) ? args[0] : Reflect.apply(original, this, args)
					},
					cleanup,
					'badge ids',
				)
			}
		}),
	)

	cleanup(
		getModules(withProps('getBadgeName', 'getBadgeAssetFromCDN'), (module: any) => {
			patchKey(
				module,
				'getBadgeName',
				function (this: any, args, original) {
					const badge = findBadge(args[0])
					return badge ? badge.name : Reflect.apply(original, this, args)
				},
				cleanup,
				'badge names',
			)
		}),
	)

	// Opening a badge asks Discord's servers about it, which doesn't know ours.
	cleanup(
		getModules(withProps('fetchBadge', 'fetchBadgeSummary'), (module: any) => {
			for (const key of ['fetchBadge', 'fetchBadgeSummary']) {
				patchKey(
					module,
					key,
					function (this: any, args, original) {
						if (isOurId(args[0])) {
							openSheet(findBadge(args[0]))
							return Promise.resolve()
						}

						return Reflect.apply(original, this, args)
					},
					cleanup,
					'badge details',
				)
			}
		}),
	)

	// Discord shows the first six badges on a profile. This lifts that limit.
	status('badge limit', 'badge limit: waiting for Discord to load it')
	cleanup(
		getModules(withProps('MAX_DISPLAYED_PROFILE_BADGES', 'getProfileBadgeIconUrl'), (module: any) => {
			const descriptor = Object.getOwnPropertyDescriptor(module, 'MAX_DISPLAYED_PROFILE_BADGES')
			if (!descriptor || descriptor.configurable === false) {
				status('badge limit', 'badge limit: cannot be changed in this Discord version')
				return
			}

			const original = module.MAX_DISPLAYED_PROFILE_BADGES
			Object.defineProperty(module, 'MAX_DISPLAYED_PROFILE_BADGES', {
				configurable: true,
				enumerable: descriptor.enumerable,
				get: () => (showsAll() ? Number.MAX_SAFE_INTEGER : original),
			})

			cleanup(() => Object.defineProperty(module, 'MAX_DISPLAYED_PROFILE_BADGES', descriptor))
			status('badge limit', 'badge limit: patched')
		}),
	)
}
