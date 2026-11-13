import { instead } from '@valenced/patcher'
import { getOverrideUrl } from './state'

let emit: (() => void) | undefined

/**
 * The You bar draws your avatar once and keeps it while `user` is the same object, so an
 * override that is ready after that first draw never shows. For your own overridden account
 * the current user is given as an equal copy (a new object), and the store is told it changed.
 */
export function patchSelf(getStore: (name: string, cb: (store: any) => void) => () => void, cleanup: (...fns: (() => unknown)[]) => void) {
	cleanup(
		getStore('UserStore', store => {
			const copies = new WeakMap<object, unknown>()

			cleanup(
				instead(store, 'getCurrentUser', (args: any[], original: (...a: any[]) => any) => {
					const user = original(...args)
					if (!user || !getOverrideUrl(user.id)) return user

					if (!copies.has(user)) {
						let copy = user
						try {
							// Change a field and change it back: equal values, new object.
							copy = user.merge({ avatar: user.avatar === 'x' ? 'y' : 'x' }).merge({ avatar: user.avatar })
						} catch {
							// Not a record in this version: leave the user alone.
						}
						copies.set(user, copy)
					}

					return copies.get(user)
				}),
			)

			emit = () => store.emitChange?.()
			emit?.()
		}),
	)
	cleanup(() => {
		emit = undefined
	})
}

/** Call after something that changes which avatar is shown (overrides loaded, avatar helpers patched). */
export function refreshSelf() {
	emit?.()
}
