import type { JsonStorage } from '@valenced/json-storage'

export interface Settings {
	excludedServers: string[]
	excludedDMs: string[]
	// Optional hex colors. Empty means "match the theme".
	tileColor: string
	circleColor: string
}

export const DEFAULT_SETTINGS: Settings = { excludedServers: [], excludedDMs: [], tileColor: '', circleColor: '' }

let storage: JsonStorage<Settings> | undefined

export function setStorage(value: JsonStorage<Settings> | undefined) {
	storage = value
}

function list(field: 'excludedServers' | 'excludedDMs'): string[] {
	const value = (storage?.cache as Partial<Settings> | undefined)?.[field]
	return Array.isArray(value) ? value : []
}

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i

function color(field: 'tileColor' | 'circleColor'): string | undefined {
	const value = (storage?.cache as Partial<Settings> | undefined)?.[field]
	const trimmed = typeof value === 'string' ? value.trim() : ''
	return HEX.test(trimmed) ? trimmed : undefined
}

/** Colors the user typed in settings, if valid. Looked up at call time. */
export const getColorOverrides = () => ({ tile: color('tileColor'), circle: color('circleColor') })

// Looked up at call time, so edits in settings apply without reloading.
export const isServerExcluded = (id: string) => list('excludedServers').includes(id)
export const isDMExcluded = (id: string) => list('excludedDMs').includes(id)
