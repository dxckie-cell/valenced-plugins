import { getStore, onFluxEventDispatched, Stores } from '@valenced/discord/flux'
import { getModules } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import { instead } from '@valenced/patcher'
import { getSettings } from './state'

// Your own username, display name and "Member Since" date, changed on this device only.

interface User {
	id: string
	username?: string
	globalName?: string | null
}

type Register = (fn: () => void) => void

const MESSAGE_EVENTS = ['MESSAGE_CREATE', 'MESSAGE_UPDATE', 'LOAD_MESSAGES_SUCCESS'] as const

let userStore: any

// Lets a changed setting make everything showing your name update.
export const refreshUsers = () => userStore?.emitChange?.()

function getNames() {
	const settings = getSettings()
	const username = (settings.username ?? '').trim()
	const displayName = (settings.displayName ?? '').trim()
	if (username || displayName) return { username, displayName }
}

// One copy per user and names, so React doesn't see a new user on every render.
const spoofed = new WeakMap<object, { key: string; user: User }>()

function spoofUser(user: User | undefined) {
	const names = getNames()
	if (!user || !names) return user

	const key = `${names.username}\u0000${names.displayName}`
	const cached = spoofed.get(user)
	if (cached?.key === key) return cached.user

	try {
		const copy: User = Object.create(Object.getPrototypeOf(user), Object.getOwnPropertyDescriptors(user))
		const set = (field: string, value: string) =>
			Object.defineProperty(copy, field, { value, enumerable: true, configurable: true, writable: true })
		if (names.username) set('username', names.username)
		if (names.displayName) set('globalName', names.displayName)
		spoofed.set(user, { key, user: copy })
		return copy
	} catch {
		return user
	}
}

// Messages arrive as raw API objects, so they use snake_case keys.
function rewriteMessages(value: unknown, myId: string, names: { username: string; displayName: string }): void {
	if (Array.isArray(value)) {
		for (const item of value) rewriteMessages(item, myId, names)
		return
	}
	if (typeof value !== 'object' || value === null) return

	const message = value as {
		author?: { id?: string; username?: string; global_name?: string | null }
		referenced_message?: unknown
	}
	const { author } = message
	if (author?.id === myId) {
		if (names.username) author.username = names.username
		if (names.displayName) author.global_name = names.displayName
	}
	if (message.referenced_message) rewriteMessages(message.referenced_message, myId, names)
}

/** Parses DD-MM-YYYY (or YYYY-MM-DD). Returns null when invalid. */
export function parseDate(value: unknown): Date | null {
	const m =
		typeof value === 'string' && /^(?:(\d{1,2})-(\d{1,2})-(\d{4})|(\d{4})-(\d{2})-(\d{2}))$/.exec(value.trim())
	if (!m) return null
	const [year, month, day] = m[1] ? [+m[3], +m[2], +m[1]] : [+m[4], +m[5], +m[6]]
	// Noon UTC so timezones never roll the day over.
	const date = new Date(Date.UTC(year, month - 1, day, 12))
	// Rejects things like 31-02-2020, which Date would roll forward.
	return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null
}

export function startIdentity(cleanup: Register, reportError: (e: unknown) => void) {
	cleanup(
		getStore<any>('UserStore', (store: any) => {
			userStore = store
			cleanup(
				instead(store, 'getCurrentUser', function (this: any, args, original) {
					return spoofUser(Reflect.apply(original, this, args))
				}),
			)
			cleanup(
				instead(store, 'getUser', function (this: any, args, original) {
					const user = Reflect.apply(original, this, args) as User | undefined
					return user && user.id === store.getCurrentUser()?.id ? spoofUser(user) : user
				}),
			)
			refreshUsers()
		}),
	)

	for (const event of MESSAGE_EVENTS)
		cleanup(
			onFluxEventDispatched<{ message?: unknown; messages?: unknown }>(event, payload => {
				try {
					const names = getNames()
					const myId = userStore?.getCurrentUser()?.id
					if (names && myId) {
						rewriteMessages(payload?.message, myId, names)
						rewriteMessages(payload?.messages, myId, names)
					}
				} catch {
					// Never break message handling over a cosmetic change.
				}
				return payload
			}),
		)

	// The fake date, but only when `target` (a user or an ID) is you.
	const fakeDate = (target: unknown) => {
		const settings = getSettings()
		if (!settings.dateEnabled) return null
		const id = typeof target === 'string' ? target : (target as any)?.id
		return id && id === (Stores as any).UserStore?.getCurrentUser?.()?.id ? parseDate(settings.date) : null
	}

	// Both helpers build the profile's creation date, depending on the Discord build. Message times
	// use message ids, so they are untouched.
	cleanup(
		getModules(withProps<any>('getCreatedAtDate'), (module: any) =>
			cleanup(
				instead(module, 'getCreatedAtDate', function (this: any, args, original) {
					const real = Reflect.apply(original, this, args)
					try {
						const fake = fakeDate(args[0])
						if (!fake) return real
						if (typeof real !== 'string') return fake
						return fake.toLocaleDateString(typeof args[1] === 'string' ? args[1] : undefined, {
							day: 'numeric',
							month: 'short',
							year: 'numeric',
							timeZone: 'UTC',
						})
					} catch (e) {
						reportError(e)
						return real
					}
				}),
			),
		),
	)

	cleanup(
		getModules(withProps<any>('extractTimestamp'), (module: any) =>
			cleanup(
				instead(module, 'extractTimestamp', function (this: any, args, original) {
					try {
						const fake = fakeDate(args[0])
						if (fake) return fake.getTime()
					} catch (e) {
						reportError(e)
					}
					return Reflect.apply(original, this, args)
				}),
			),
		),
	)

	cleanup(() => {
		refreshUsers()
		userStore = undefined
	})
}
