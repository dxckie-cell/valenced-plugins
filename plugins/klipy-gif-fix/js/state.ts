import type { JsonStorage } from '@valenced/json-storage'

export interface Settings {
	apiKey: string
}

export const DEFAULT_SETTINGS: Settings = { apiKey: '' }

let storage: JsonStorage<Settings> | undefined

export function setStorage(value: JsonStorage<Settings> | undefined) {
	storage = value
}

// Shared key, used when the user hasn't set their own. It ships inside the plugin, so it is public.
export const DEFAULT_KEY =
	'hys2t7q0jGew8WcqM24qNQUGDKU6E0ZNiPBP0B3SMXq9RgqyA5NwiKZPBMKMVRg8'

/** Looked up at call time, so a key pasted in settings applies without reloading. */
export function getKey(): string {
	const key = (storage?.cache as Partial<Settings> | undefined)?.apiKey
	return (typeof key === 'string' && key.trim()) || DEFAULT_KEY
}
