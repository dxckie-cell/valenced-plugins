import type { JsonStorage } from '@valenced/json-storage'

export interface Settings {
	apiKey: string
}

export const DEFAULT_SETTINGS: Settings = { apiKey: '' }

let storage: JsonStorage<Settings> | undefined

export function setStorage(value: JsonStorage<Settings> | undefined) {
	storage = value
}

/** Looked up at call time, so a key pasted in settings applies without reloading. */
export function getKey(): string {
	const key = (storage?.cache as Partial<Settings> | undefined)?.apiKey
	return typeof key === 'string' ? key.trim() : ''
}
