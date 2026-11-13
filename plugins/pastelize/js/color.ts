import { lookupModule } from '@valenced/modules/finders'
import { withName } from '@valenced/modules/finders/filters'
import { processColor } from 'react-native'
import { getSettings } from './state'

// MurmurHash3 (x86, 32 bit, seed 0), used only if Discord's own copy can't be found.
function murmur3(key: string): number {
	let h = 0
	const blocks = key.length & ~3
	for (let i = 0; i < blocks; i += 4) {
		let k =
			(key.charCodeAt(i) & 0xff) |
			((key.charCodeAt(i + 1) & 0xff) << 8) |
			((key.charCodeAt(i + 2) & 0xff) << 16) |
			((key.charCodeAt(i + 3) & 0xff) << 24)
		k = Math.imul(k, 0xcc9e2d51)
		k = (k << 15) | (k >>> 17)
		k = Math.imul(k, 0x1b873593)
		h ^= k
		h = (h << 13) | (h >>> 19)
		h = (Math.imul(h, 5) + 0xe6546b64) | 0
	}
	let k = 0
	switch (key.length & 3) {
		case 3:
			k ^= (key.charCodeAt(blocks + 2) & 0xff) << 16
		// falls through
		case 2:
			k ^= (key.charCodeAt(blocks + 1) & 0xff) << 8
		// falls through
		case 1:
			k ^= key.charCodeAt(blocks) & 0xff
			k = Math.imul(k, 0xcc9e2d51)
			k = (k << 15) | (k >>> 17)
			k = Math.imul(k, 0x1b873593)
			h ^= k
	}
	h ^= key.length
	h ^= h >>> 16
	h = Math.imul(h, 0x85ebca6b)
	h ^= h >>> 13
	h = Math.imul(h, 0xc2b2ae35)
	h ^= h >>> 16
	return h >>> 0
}

// Discord's hash gives the same colors as the Vendetta plugin did. null = looked up, not found.
let native: ((key: string) => number) | null | undefined

function hash(key: string): number {
	if (native === undefined) {
		try {
			const found: any = lookupModule(withName('MurmurHashV3'))?.[0]
			const fn = typeof found === 'function' ? found : found?.default
			native = typeof fn === 'function' ? fn : null
		} catch {
			native = null
		}
	}
	return (native ?? murmur3)(key)
}

function hslToHex(h: number, s: number, l: number): string {
	const a = s * Math.min(l, 1 - l)
	const channel = (n: number) => {
		const k = (n + h / 30) % 12
		const v = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
		return Math.round(v * 255)
			.toString(16)
			.padStart(2, '0')
	}
	return `#${channel(0)}${channel(8)}${channel(4)}`
}

/** "#rrggbb" for an ID. */
export function pastelHex(id: string): string {
	const { saturation, lightness } = getSettings()
	// This account has a hand-picked hue.
	const hue = id === '641375574631383051' ? 325 : ((hash(id) % 360) + 360) % 360
	return hslToHex(hue, saturation / 100, lightness / 100)
}

/** The same color as a native color number, which is what message rows hold. */
export function pastelNative(id: string): number {
	const hex = pastelHex(id)
	const value = processColor(hex)
	return typeof value === 'number' ? value : 0xff000000 + Number.parseInt(hex.slice(1), 16)
}
