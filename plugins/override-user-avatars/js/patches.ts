import { getModules } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import { instead } from '@valenced/patcher'
import { getOverrideUrl, status } from './state'

type Cleanup = () => unknown

const AVATAR_PATH = 'utils/AvatarUtils.tsx'

// Modules already patched, so one module reached two ways is only changed once.
const patchedModules = new WeakSet<object>()

// Patches the avatar functions on one module, and on its `default` export if it has one.
function patchModule(exports: any, label: string, cleanup: (...fns: Cleanup[]) => void) {
	const patched: string[] = []

	for (const target of [exports, exports?.default]) {
		if (!target || typeof target !== 'object' || patchedModules.has(target)) continue
		patchedModules.add(target)

		try {
			if (typeof target.getUserAvatarSource === 'function') {
				cleanup(
					instead(
						target,
						'getUserAvatarSource',
						function (this: any, args: any[], original: any) {
							const result = Reflect.apply(original, this, args)
							const uri = getOverrideUrl(args[0]?.id)

							return uri
								? { ...(typeof result === 'object' ? result : {}), uri }
								: result
						},
					),
				)
				patched.push('getUserAvatarSource')
			}

			if (typeof target.getUserAvatarURL === 'function') {
				cleanup(
					instead(
						target,
						'getUserAvatarURL',
						function (this: any, args: any[], original: any) {
							return getOverrideUrl(args[0]?.id) ?? Reflect.apply(original, this, args)
						},
					),
				)
				patched.push('getUserAvatarURL')
			}
		} catch (e) {
			status(label, `${label}: could not patch (${(e as Error)?.message})`)
			return
		}
	}

	if (patched.length) status(label, `${label}: patched (${patched.join(', ')})`)
}

// The avatar helpers Discord uses for chat, member lists, DMs and calls. They are found
// by file path and by function name, because Discord keeps them in more than one place.
function patchAvatarHelpers(
	getByPath: ((path: string, cb: (exports: any) => void) => () => void) | undefined,
	cleanup: (...fns: Cleanup[]) => void,
) {
	status('byName', 'avatar helpers by name: waiting for Discord to load them')
	status('byPath', 'avatar helpers by path: waiting for Discord to load them')

	for (const name of ['getUserAvatarSource', 'getUserAvatarURL']) {
		cleanup(
			getModules(withProps<Record<string, any>>(name), exports =>
				patchModule(exports, 'byName', cleanup),
			),
		)
	}

	try {
		if (!getByPath) throw new Error('path finder not available')
		cleanup(getByPath(AVATAR_PATH, exports => patchModule(exports, 'byPath', cleanup)))
	} catch (e) {
		status('byPath', `avatar helpers by path: not available (${(e as Error)?.message})`)
	}
}

export function applyPatches(
	getByPath: Parameters<typeof patchAvatarHelpers>[0],
	cleanup: (...fns: Cleanup[]) => void,
) {
	patchAvatarHelpers(getByPath, cleanup)
}
