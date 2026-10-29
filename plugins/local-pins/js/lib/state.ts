import type { JsonStorage } from '@valenced/json-storage'

/** Pin storage. Pins are one flat array: `jsonStorage.set()` replaces arrays, so removals stick. */

export interface Pin {
	channelId: string
	id: string
	pinned: number
}

export interface PinStore {
	pins: Pin[]
}

export const DEFAULTS: PinStore = { pins: [] }

type Storage = JsonStorage<PinStore>

let storage: Storage | undefined

export function setStorage(value: Storage | undefined) {
	storage = value
}

function read(): Pin[] {
	const pins = (storage?.cache as PinStore | undefined)?.pins
	return Array.isArray(pins) ? pins : []
}

const newestFirst = (a: Pin, b: Pin) => b.pinned - a.pinned

/** Re-renders the caller when pins change. Call from a component. */
export function usePins(channelId?: string): Pin[] {
	const stored = storage?.use()
	const pins = Array.isArray(stored?.pins) ? stored.pins : read()
	return (channelId ? pins.filter(p => p.channelId === channelId) : [...pins]).sort(newestFirst)
}

export const getPins = (channelId?: string) =>
	(channelId ? read().filter(p => p.channelId === channelId) : [...read()]).sort(newestFirst)

export const hasPin = (channelId: string, id: string) =>
	read().some(p => p.channelId === channelId && p.id === id)

export function addPin(channelId: string, id: string) {
	if (hasPin(channelId, id)) return
	return storage?.set({ pins: [...read(), { channelId, id, pinned: Date.now() }] })
}

export function removePin(channelId: string, id: string) {
	return storage?.set({ pins: read().filter(p => !(p.channelId === channelId && p.id === id)) })
}

export const clearPins = () => storage?.set({ pins: [] })
