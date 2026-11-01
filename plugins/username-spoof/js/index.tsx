import { getStore, onFluxEventDispatched } from '@valenced/discord/flux'
import { instead } from '@valenced/patcher'
import SettingsComponent from './settings'
import { DefaultSettings, refreshUsers, setRefresh } from './shared'
import type { JsonStorage } from '@valenced/json-storage'
import type { Settings } from './shared'

interface User {
	id: string
	username?: string
	globalName?: string | null
}

interface UserStore {
	getCurrentUser(): User | undefined
	getUser(id: string): User | undefined
	emitChange?(): void
}

interface MessagePayload {
	message?: unknown
	messages?: unknown
}

const MessageEvents = [
	'MESSAGE_CREATE',
	'MESSAGE_UPDATE',
	'LOAD_MESSAGES_SUCCESS',
] as const

let storage: JsonStorage<Settings>
let userStore: UserStore | undefined

function getNames() {
	const settings = { ...DefaultSettings, ...storage?.cache }
	const username = settings.username.trim()
	const displayName = settings.displayName.trim()
	if (username || displayName) return { username, displayName }
}

// One spoofed object per user and names, so React doesn't see a new user every render
const spoofed = new WeakMap<object, { key: string; user: User }>()

function spoofUser(user: User | undefined) {
	const names = getNames()
	if (!user || !names) return user

	const key = `${names.username}\u0000${names.displayName}`
	const cached = spoofed.get(user)
	if (cached?.key === key) return cached.user

	try {
		// Full copy (prototype and every own field), so `{ ...user }` keeps working
		const copy: User = Object.create(
			Object.getPrototypeOf(user),
			Object.getOwnPropertyDescriptors(user),
		)
		if (names.username)
			Object.defineProperty(copy, 'username', {
				value: names.username,
				enumerable: true,
				configurable: true,
				writable: true,
			})
		if (names.displayName)
			Object.defineProperty(copy, 'globalName', {
				value: names.displayName,
				enumerable: true,
				configurable: true,
				writable: true,
			})

		spoofed.set(user, { key, user: copy })
		return copy
	} catch {
		return user
	}
}

// Messages arrive as raw API objects, so they use snake_case keys
function rewriteMessages(
	value: unknown,
	myId: string,
	names: { username: string; displayName: string },
): void {
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
	if (message.referenced_message)
		rewriteMessages(message.referenced_message, myId, names)
}

export default plugin<{ jsonStorage: Settings }>({
	jsonStorage: {
		load: true,
		default: DefaultSettings,
	},
	start({ cleanup, jsonStorage }) {
		storage = jsonStorage

		cleanup(
			getStore<UserStore>('UserStore', store => {
				userStore = store

				cleanup(
					instead(store, 'getCurrentUser', function (args, original) {
						return spoofUser(Reflect.apply(original, this, args))
					}),
				)
				cleanup(
					instead(store, 'getUser', function (args, original) {
						const user = Reflect.apply(original, this, args) as User | undefined
						return user && user.id === store.getCurrentUser()?.id
							? spoofUser(user)
							: user
					}),
				)

				setRefresh(() => store.emitChange?.())
				refreshUsers()
			}),
		)

		for (const event of MessageEvents)
			cleanup(
				onFluxEventDispatched<MessagePayload>(event, payload => {
					try {
						const names = getNames()
						const myId = userStore?.getCurrentUser()?.id
						if (names && myId) {
							rewriteMessages(payload?.message, myId, names)
							rewriteMessages(payload?.messages, myId, names)
						}
					} catch {
						// Never break message handling over a cosmetic change
					}
					return payload
				}),
			)

		cleanup(() => {
			refreshUsers()
			setRefresh(undefined)
			userStore = undefined
		})
	},
	SettingsComponent,
})
