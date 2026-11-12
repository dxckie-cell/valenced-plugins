import type { JsonStorage } from '@valenced/json-storage'

export interface Settings {
	pastelizeAll: boolean
	webhookName: boolean
}

export const DEFAULT_SETTINGS: Settings = {
	pastelizeAll: false,
	webhookName: true,
}

let storage: JsonStorage<Settings> | undefined

export function setStorage(value: JsonStorage<Settings> | undefined) {
	storage = value
}

// Read on every message, so changes in settings apply without reloading.
export const getSettings = (): Settings => ({
	...DEFAULT_SETTINGS,
	...((storage?.cache as Partial<Settings> | undefined) ?? {}),
})
