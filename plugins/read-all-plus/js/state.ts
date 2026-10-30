import type { JsonStorage } from '@valenced/json-storage'

export interface Settings {
	excludedServers: string[]
	excludedDMs: string[]
}

export const DEFAULT_SETTINGS: Settings = { excludedServers: [], excludedDMs: [] }

let storage: JsonStorage<Settings> | undefined

export function setStorage(value: JsonStorage<Settings> | undefined) {
	storage = value
}

function list(field: keyof Settings): string[] {
	const value = (storage?.cache as Partial<Settings> | undefined)?.[field]
	return Array.isArray(value) ? value : []
}

// Looked up at call time, so edits in settings apply without reloading.
export const isServerExcluded = (id: string) => list('excludedServers').includes(id)
export const isDMExcluded = (id: string) => list('excludedDMs').includes(id)
