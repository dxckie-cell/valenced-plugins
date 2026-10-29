import { getModules } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import { before, instead } from '@valenced/patcher'
import { getOverrideUrl, PLACEHOLDER_HASH, status } from './state'

type Cleanup = () => unknown

// Display profiles already patched, so each is only changed once.
const patchedProfiles = new WeakSet<object>()

// Profiles we put a placeholder banner on, with what the banner was before.
const injected = new Map<any, any>()

/**
 * The profile screen builds its banner from a "displayProfile" object, so that
 * object's `getBannerURL` is pointed at the override. `banner` is also made to
 * report a placeholder, so the screen draws a banner area for users without one.
 *
 * Both are looked up again on every read, so removing an override puts back the
 * original banner straight away.
 */
function patchDisplayProfile(profile: any, userId?: string) {
	if (!profile || typeof profile !== 'object' || patchedProfiles.has(profile)) return

	const id = userId ?? profile.userId
	if (!id || !getOverrideUrl(id)) return
	patchedProfiles.add(profile)

	const originalGetBannerURL = profile.getBannerURL
	let banner = profile.banner

	try {
		Object.defineProperty(profile, 'banner', {
			get: () => (getOverrideUrl(id) ? banner || PLACEHOLDER_HASH : banner),
			set: value => {
				banner = value
			},
			configurable: true,
			enumerable: true,
		})

		Object.defineProperty(profile, 'getBannerURL', {
			value: (...args: unknown[]) =>
				getOverrideUrl(id) ??
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

// Gives a profile of an overridden user a placeholder banner, in place, so any
// methods on it keep working. Restored when the plugin stops.
function addPlaceholderBanner(profile: any, userId?: string) {
	if (!profile || typeof profile !== 'object' || profile.banner || !getOverrideUrl(userId)) {
		return profile
	}

	try {
		injected.set(profile, profile.banner)
		profile.banner = PLACEHOLDER_HASH
	} catch {
		// Frozen objects are left alone.
	}

	return profile
}

// The hook the profile screen calls with `{ user, displayProfile, ... }`.
function patchBannerHook(cleanup: (...fns: Cleanup[]) => void) {
	status('banner', 'profile screen banner: waiting for Discord to load it')

	const unsubscribe = getModules(
		withProps<Record<string, any>>('useUserProfileBannerBackgroundColor'),
		exports => {
			try {
				const unpatch = before(
					exports,
					'useUserProfileBannerBackgroundColor',
					(args: any[]) => {
						const arg = args[0]
						if (arg && typeof arg === 'object' && arg.displayProfile) {
							patchDisplayProfile(arg.displayProfile, arg.user?.id)
						}

						return args
					},
				)

				cleanup(unpatch)
				status('banner', 'profile screen banner: patched')
			} catch (e) {
				status('banner', `profile screen banner: could not patch (${(e as Error)?.message})`)
			}
		},
	)

	cleanup(unsubscribe)
}

// The profile stores, so users without a banner still get one drawn.
function patchProfileStore(
	getStore: (name: string, callback: (store: any) => void) => () => void,
	cleanup: (...fns: Cleanup[]) => void,
) {
	status('store', 'profile store: waiting for Discord to load it')

	const unsubscribe = getStore('UserProfileStore', store => {
		let patched = 0

		for (const key of ['getUserProfile', 'getGuildMemberProfile']) {
			try {
				cleanup(
					instead(
						store,
						key,
						(args: any[], original: (...a: any[]) => any) =>
							addPlaceholderBanner(original(...args), args[0]),
					),
				)
				patched++
			} catch {
				// Missing in this Discord version.
			}
		}

		status('store', patched ? 'profile store: patched' : 'profile store: could not patch')
	})

	cleanup(unsubscribe)
}

export function applyPatches(
	getStore: (name: string, callback: (store: any) => void) => () => void,
	cleanup: (...fns: Cleanup[]) => void,
) {
	patchBannerHook(cleanup)
	patchProfileStore(getStore, cleanup)

	cleanup(() => {
		for (const [profile, original] of injected) {
			try {
				profile.banner = original
			} catch {
				// Nothing to restore.
			}
		}

		injected.clear()
	})
}
