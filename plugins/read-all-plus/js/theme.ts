import { Tokens } from '@valenced/discord/common/tokens'
import { Stores } from '@valenced/discord/flux'
import { useEffect, useState } from 'react'
import { StyleSheet } from 'react-native'
import { nativeFooterRef } from './nativeRef'
import { getColorOverrides } from './state'

type Rgba = [number, number, number, number]

function parse(color: unknown): Rgba | undefined {
	if (typeof color !== 'string') return
	let m = color.trim().match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/i)
	if (m) {
		const n = Number.parseInt(m[1]!, 16)
		return [(n >> 16) & 255, (n >> 8) & 255, n & 255, m[2] ? Number.parseInt(m[2], 16) / 255 : 1]
	}
	m = color.trim().match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)$/i)
	if (m) {
		const a = m[4] === undefined ? 1 : m[4].endsWith('%') ? Number.parseFloat(m[4]) / 100 : Number.parseFloat(m[4])
		return [+m[1]!, +m[2]!, +m[3]!, a]
	}
}

// Puts a translucent color on top of an opaque one.
const flatten = ([r, g, b, a]: Rgba, [br, bg, bb]: Rgba): Rgba => [
	r * a + br * (1 - a),
	g * a + bg * (1 - a),
	b * a + bb * (1 - a),
	1,
]

const hex = ([r, g, b]: Rgba) =>
	`#${[r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')}`

const themeStore = (): any => {
	try {
		return (Stores as any).ThemeStore
	} catch {
		return undefined
	}
}

// ---- Main source: the colors of Discord's own "+" tile, read from what is on screen ----------

const HANDLE_KEYS = ['__internalInstanceHandle', '_internalInstanceHandle', '_internalFiberInstanceHandleDEV']

function fiberOf(host: any): any {
	for (const key of HANDLE_KEYS) {
		try {
			if (host?.[key]) return host[key]
		} catch {}
	}
}

// Colors can be strings or native color objects (PlatformColor and friends). Both are valid in
// a style, so both are kept. Anything else (token objects, flags) is ignored, and fully
// transparent colors are skipped, they are not the tile.
const isNativeColor = (v: any) =>
	!!v && typeof v === 'object' && ('semantic' in v || 'dynamic' in v || 'resource_paths' in v)

function readColor(value: any): any {
	if (value && typeof value === 'object' && typeof value.__getValue === 'function') {
		try {
			value = value.__getValue()
		} catch {
			return
		}
	}
	if (typeof value === 'string') {
		const parsed = parse(value)
		return parsed && parsed[3] < 0.05 ? undefined : parsed ? value : undefined
	}
	return isNativeColor(value) ? value : undefined
}

// True when two colors are clearly different. Colors that can't be compared count as different
// unless they are the same value.
function distinct(a: any, b: any): boolean {
	const pa = parse(a)
	const pb = parse(b)
	if (!pa || !pb) return a !== b
	return Math.hypot(pa[0] - pb[0], pa[1] - pb[1], pa[2] - pb[2]) > 30
}

interface Sampled {
	tile?: any
	circle?: any
}

const TINT_PROPS = ['tintColor', 'color', 'fill', 'stroke']

/**
 * Walks the native footer: the first background is the tile. The "+" shape is the first icon
 * color (tint, fill, color prop) that differs from the tile, else a nested background that does.
 */
function sampleNative(host: any): Sampled | undefined {
	const root = fiberOf(host)
	if (!root) return

	const backgrounds: any[] = []
	const tints: any[] = []
	let visited = 0

	const visit = (fiber: any, depth: number) => {
		for (let f = fiber; f && visited < 600; f = f.sibling) {
			visited++
			const props = f.memoizedProps
			if (props && typeof props === 'object') {
				const style: any = typeof f.type === 'string' ? (StyleSheet.flatten(props.style) ?? {}) : {}
				if (typeof f.type === 'string') {
					const bg = readColor(style.backgroundColor)
					if (bg !== undefined) backgrounds.push(bg)
				}
				for (const key of TINT_PROPS) {
					const tint = readColor(props[key] ?? style[key])
					if (tint !== undefined) tints.push(tint)
				}
			}
			if (f.child && depth < 60) visit(f.child, depth + 1)
		}
	}
	visit(root.child, 0)

	const tile = backgrounds[0]
	if (tile === undefined) return
	const circle = tints.find(c => distinct(c, tile)) ?? backgrounds.find(c => distinct(c, tile))
	return { tile, circle }
}

// ---- Fallback: theme color tokens, used until (or unless) the tile can be read ----------------

const TILE_TOKENS = ['BG_BASE_SECONDARY', 'BACKGROUND_SECONDARY', 'BG_SURFACE_RAISED', 'BACKGROUND_MOD_SUBTLE']
const CIRCLE_TOKENS = ['TEXT_DEFAULT', 'INTERACTIVE_ICON_ACTIVE', 'TEXT_NORMAL', 'HEADER_PRIMARY']
const BACKDROP_TOKENS = ['BG_BASE_TERTIARY', 'BACKGROUND_TERTIARY', 'BG_BASE_PRIMARY']

function resolveToken(name: string): string | undefined {
	try {
		const t: any = Tokens
		const token = (t?.colors ?? t?.default?.colors)?.[name]
		if (token === undefined) return
		const resolve = (t?.meta ?? t?.default?.meta)?.resolveSemanticColor
		const value = resolve?.(themeStore()?.theme, token)
		return typeof value === 'string' ? value : undefined
	} catch {
		return undefined
	}
}

const firstToken = (names: string[], fallback: string) => {
	for (const name of names) {
		const value = resolveToken(name)
		if (value) return value
	}
	return fallback
}

function fallbackColors() {
	return {
		tile: firstToken(TILE_TOKENS, '#2b2d31'),
		circle: firstToken(CIRCLE_TOKENS, '#dbdee1'),
		backdrop: firstToken(BACKDROP_TOKENS, '#1e1f22'),
	}
}

const sameSample = (a?: Sampled, b?: Sampled) => a?.tile === b?.tile && a?.circle === b?.circle

// Colors for the button. Re-read when the theme changes.
export function useThemeColors() {
	const [sampled, setSampled] = useState<Sampled | undefined>()
	const [version, bump] = useState(0)

	useEffect(() => {
		const store = themeStore()
		if (!store?.addChangeListener) return
		const listener = () => bump(n => n + 1)
		store.addChangeListener(listener)
		return () => store.removeChangeListener?.(listener)
	}, [])

	// Read after render, and again shortly after, since the native tile may repaint a moment later.
	// biome-ignore lint/correctness/useExhaustiveDependencies: `version` is the re-read trigger
	useEffect(() => {
		const read = () => {
			let next: Sampled | undefined
			try {
				next = sampleNative(nativeFooterRef.current)
			} catch {}
			setSampled(prev => {
				if (sameSample(prev, next)) return prev
				console.log('[read-all-plus] native tile colors', JSON.stringify(next ?? null))
				return next
			})
		}
		read()
		const timer = setTimeout(read, 300)
		return () => clearTimeout(timer)
	}, [version])

	const fb = fallbackColors()
	const custom = getColorOverrides()
	const tile = custom.tile ?? sampled?.tile ?? fb.tile
	let circle = custom.circle ?? sampled?.circle ?? fb.circle
	// Never let the "+" shape disappear into the tile.
	if (!distinct(circle, tile)) circle = distinct(fb.circle, tile) ? fb.circle : '#ffffff'

	// The eye is cut out of the circle, so it takes the tile color. If the tile is translucent,
	// flatten it over the bar background so the cut-out is not see-through.
	const parsed = parse(tile)
	const backdrop = parse(fb.backdrop)
	const glyph = parsed && backdrop && parsed[3] < 1 ? hex(flatten(parsed, backdrop)) : tile

	return { tile, circle, glyph }
}
