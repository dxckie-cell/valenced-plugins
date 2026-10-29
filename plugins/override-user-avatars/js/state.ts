import type { JsonStorage } from '@valenced/json-storage'

export interface AvatarOverride {
	id: string
	url: string
}

export interface Settings {
	overrides: AvatarOverride[]
}

export const DEFAULT_SETTINGS: Settings = { overrides: [] }

let storage: JsonStorage<Settings> | undefined

export function setStorage(value: JsonStorage<Settings> | undefined) {
	storage = value
}

export function getOverrides(): AvatarOverride[] {
	const cache = storage?.cache as Partial<Settings> | undefined
	return Array.isArray(cache?.overrides) ? cache.overrides : []
}

// Looked up at call time, so edits in settings apply without reloading.
export function getOverrideUrl(userId?: string): string | undefined {
	if (!userId) return undefined

	for (const entry of getOverrides()) {
		if (entry?.id?.trim() === userId && entry.url?.trim()) {
			return entry.url.trim()
		}
	}

	return undefined
}

// What happened on load, shown at the bottom of the settings screen.
// Each line has a key, so a later result replaces an earlier one.
const statusLines = new Map<string, string>()

export function status(key: string, message: string) {
	statusLines.set(key, message)
	console.log(`[override-user-avatars] ${message}`)
}

export function getStatusLines(): string[] {
	return [...statusLines.values()]
}

export function resetStatus() {
	statusLines.clear()
}
