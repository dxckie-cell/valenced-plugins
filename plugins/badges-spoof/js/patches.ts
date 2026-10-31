import { getModules } from '@valenced/modules/finders'
import { withName, withProps } from '@valenced/modules/finders/filters'
import { before, instead } from '@valenced/patcher'
import * as React from 'react'
import { StyleSheet } from 'react-native'
import { catalogEntry, findBadge, isOurId, isRecord, learn, withBadges, withCatalog } from './badges'
import { getVersion, isHidden, setHidden, showsAll, status, subscribe } from './state'

type Cleanup = () => unknown
type Register = (...fns: Cleanup[]) => void
type GetStore = (name: string, callback: (store: any) => void) => () => void
type Original = (...args: any[]) => any
type Hook = (this: any, args: any[], original: Original) => any

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

const withoutOurs = (list: unknown) => (Array.isArray(list) ? list.filter(id => !isOurId(id)) : list)

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

	let wrapSeen = false
	let iconSeen = false

	const intercept = (args: any[]) => {
		try {
			const props = args[1]
			if (!props || typeof props !== 'object') return args

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

					// Someone else's badges: copy the details of the ones we want.
					if (userId !== currentUserId()) {
						for (const entry of result) learn(entry)
						return result
					}

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
					if (badge) return catalogEntry(badge)

					// The sheet for a real badge: copy its details if it is one we want.
					const result = Reflect.apply(original, this, args)
					learn(result)
					return result
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
					if (!Array.isArray(order) || !order.some(isOurId)) {
						return Reflect.apply(original, this, args)
					}

					return Reflect.apply(original, this, [withoutOurs(order), ...args.slice(1)])
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
						return isOurId(args[0]) ? Promise.resolve() : Reflect.apply(original, this, args)
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
