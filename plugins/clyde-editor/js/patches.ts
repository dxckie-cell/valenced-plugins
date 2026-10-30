import { getModuleWithImportedPath } from '@valenced/discord/utils/modules/finders'
import { getModules } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import { before, instead } from '@valenced/patcher'
import { processColor } from 'react-native'
import {
	getAvatar,
	getBadgeBgColor,
	getBadgeText,
	getBadgeTextColor,
	getBanner,
	getName,
	getNameColor,
	getVerified,
	PLACEHOLDER_HASH,
	TARGET_ID,
} from './state'

type Cleanup = () => unknown
type Register = (...fns: Cleanup[]) => void
type GetStore = (name: string, callback: (store: any) => void) => () => void
type Original = (...args: any[]) => any

// Display profiles already patched, so each is only changed once.
const patchedProfiles = new WeakSet<object>()

// Objects we put a placeholder banner on, with what the banner was before.
const injected = new Map<any, any>()

// Users we renamed, with their original names.
const renamed = new Map<any, { username: unknown; globalName: unknown }>()

// True if the account has a banner to show.
const wants = (id?: string) => id === TARGET_ID && Boolean(getBanner(id))

// A minimal profile for an account that has none in the store, so the profile
// screen has something to draw a banner from.
function standInProfile(id: string) {
	return {
		userId: id,
		banner: PLACEHOLDER_HASH,
		bio: '',
		accentColor: null,
		themeColors: undefined,
		badges: [],
		connectedAccounts: [],
		getBannerURL: () => getBanner(id),
	}
}

// The profile screen builds its banner from a "displayProfile" object, so that
// object's `getBannerURL` is pointed at the override, and `banner` reports a
// placeholder so a banner area is drawn. Both are looked up again on every read.
function patchDisplayProfile(profile: any, userId?: string) {
	if (!profile || typeof profile !== 'object' || patchedProfiles.has(profile)) return

	const id = userId ?? profile.userId
	if (!id || !wants(id)) return
	patchedProfiles.add(profile)

	const originalGetBannerURL = profile.getBannerURL
	let banner = profile.banner

	try {
		Object.defineProperty(profile, 'banner', {
			get: () => (getBanner(id) ? banner || PLACEHOLDER_HASH : banner),
			set: value => {
				banner = value
			},
			configurable: true,
			enumerable: true,
		})

		Object.defineProperty(profile, 'getBannerURL', {
			value: (...args: unknown[]) =>
				getBanner(id) ??
				(typeof originalGetBannerURL === 'function'
					? originalGetBannerURL.apply(profile, args)
					: undefined),
			configurable: true,
			writable: true,
			enumerable: true,
		})
	} catch {
		// Frozen objects are left alone.
	}
}

// Gives the account's user or profile a placeholder banner, in place.
// Restored when the plugin stops.
function addPlaceholderBanner(target: any, userId?: string) {
	if (!target || typeof target !== 'object' || target.banner || !getBanner(userId)) {
		return target
	}

	try {
		injected.set(target, target.banner)
		target.banner = PLACEHOLDER_HASH
	} catch {
		// Frozen objects are left alone.
	}

	return target
}

// Applies the name setting to the user, or puts the original name back if it was cleared.
function applyName(user: any) {
	const name = getName()

	try {
		if (name) {
			if (!renamed.has(user)) {
				renamed.set(user, { username: user.username, globalName: user.globalName })
			}
			user.username = name
			user.globalName = name
		} else if (renamed.has(user)) {
			Object.assign(user, renamed.get(user))
			renamed.delete(user)
		}
	} catch {
		// Frozen objects are left alone.
	}
}

type Hook = (args: any[], original: Original) => any

// Replaces `key` on `target`; a failure is logged and leaves everything else working.
function patchKey(target: any, key: string, hook: Hook, cleanup: Register) {
	try {
		cleanup(instead(target, key, hook))
	} catch (e) {
		console.log(`[clyde-editor] could not patch ${key}`, e)
	}
}

// Patches `key` on the exports of the module that has it, once Discord loads it.
function patchModule(key: string, hook: Hook, cleanup: Register) {
	cleanup(
		getModules(withProps<Record<string, any>>(key), exports =>
			patchKey(exports, key, hook, cleanup),
		),
	)
}

// The id in `getUserBannerURL(user)` and friends.
const idOf = (arg: any): string | undefined =>
	typeof arg === 'string' ? arg : (arg?.id ?? arg?.userId)

// The badge expects native color numbers, not hex strings.
function toNative(hex?: string): number | undefined {
	try {
		const value = hex ? processColor(hex) : undefined
		return typeof value === 'number' ? value : undefined
	} catch {
		return undefined
	}
}

// True if any argument looks like a message or author belonging to the account.
function isTarget(args: any[]): boolean {
	return args.some(
		a =>
			a &&
			typeof a === 'object' &&
			(a.authorId === TARGET_ID ||
				a.id === TARGET_ID ||
				a.author?.id === TARGET_ID ||
				a.message?.author?.id === TARGET_ID ||
				a.message?.authorId === TARGET_ID),
	)
}

// Patches `key` on the module Discord imports from `path`, once it loads.
function patchImported(path: string, key: string, hook: Hook, cleanup: Register) {
	cleanup(
		getModuleWithImportedPath<any>(path, exports => patchKey(exports, key, hook, cleanup)),
	)
}

// Name color and the bot badge shown on the account's chat messages.
function patchMessages(cleanup: Register) {
	patchImported(
		'modules/messages/useMessageAuthor.tsx',
		'getMessageAuthor',
		(args, original) => {
			const result = original(...args)
			const color = getNameColor()
			return color && result && isTarget(args) ? { ...result, colorString: color } : result
		},
		cleanup,
	)

	patchImported(
		'modules/messages/native/renderer/getTagProperties.tsx',
		'default',
		(args, original) => {
			const result = original(...args)
			if (!isTarget(args)) return result

			const text = getBadgeText()
			const bg = toNative(getBadgeBgColor())
			const fg = toNative(getBadgeTextColor())
			const verified = getVerified()
			if (!text && bg === undefined && fg === undefined && !verified) return result

			return {
				...result,
				...(text && { tagText: text, tagAccessibilityLabel: text }),
				...(bg !== undefined && { tagBackgroundColor: bg }),
				...(fg !== undefined && { tagTextColor: fg }),
				...(verified && { tagVerified: true }),
			}
		},
		cleanup,
	)
}

export function applyPatches(getStore: GetStore, cleanup: Register) {
	// The user store: renames the account and gives it a placeholder banner.
	cleanup(
		getStore('UserStore', store =>
			patchKey(
				store,
				'getUser',
				(args, original) => {
					const user = original(...args)
					if (user && args[0] === TARGET_ID) {
						applyName(user)
						addPlaceholderBanner(user, TARGET_ID)
					}
					return user
				},
				cleanup,
			),
		),
	)

	// The picture shown for the account.
	patchModule(
		'getUserAvatarSource',
		(args, original) => {
			const avatar = getAvatar()
			return args[0]?.id === TARGET_ID && avatar ? { uri: avatar } : original(...args)
		},
		cleanup,
	)

	// The hook the profile screen calls with `{ user, displayProfile, ... }`. An account
	// with no profile arrives without a displayProfile, so it is given a stand-in.
	cleanup(
		getModules(withProps<Record<string, any>>('useUserProfileBannerBackgroundColor'), exports => {
			try {
				cleanup(
					before(exports, 'useUserProfileBannerBackgroundColor', (args: any[]) =>
						args.map(arg => {
							if (!arg || typeof arg !== 'object') return arg

							if (arg.displayProfile) {
								patchDisplayProfile(arg.displayProfile, arg.user?.id)
								return arg
							}

							const id = arg.user?.id ?? arg.userId
							return wants(id) ? { ...arg, displayProfile: standInProfile(id) } : arg
						}),
					),
				)
			} catch (e) {
				console.log('[clyde-editor] could not patch the profile screen banner', e)
			}
		}),
	)

	// Screens that build the banner URL themselves.
	for (const key of ['getUserBannerURL', 'getGuildMemberBannerURL']) {
		patchModule(key, (args, original) => getBanner(idOf(args[0])) ?? original(...args), cleanup)
	}

	// The profile stores: the account has no profile, so it gets a stand-in.
	cleanup(
		getStore('UserProfileStore', store => {
			for (const key of ['getUserProfile', 'getGuildMemberProfile']) {
				patchKey(
					store,
					key,
					(args, original) => {
						const profile = original(...args)
						if (args[0] !== TARGET_ID || !wants(TARGET_ID)) return profile
						if (!profile && key === 'getUserProfile') return standInProfile(TARGET_ID)
						patchDisplayProfile(profile, TARGET_ID)
						return addPlaceholderBanner(profile, TARGET_ID)
					},
					cleanup,
				)
			}
		}),
	)

	patchMessages(cleanup)

	cleanup(() => {
		for (const [target, original] of injected) {
			try {
				target.banner = original
			} catch {
				// Nothing to restore.
			}
		}
		injected.clear()

		for (const [user, names] of renamed) {
			try {
				Object.assign(user, names)
			} catch {
				// Nothing to restore.
			}
		}
		renamed.clear()
	})
}
