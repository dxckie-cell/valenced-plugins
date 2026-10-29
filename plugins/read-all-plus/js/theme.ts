import { Tokens } from '@valenced/discord/common/tokens'
import { Stores } from '@valenced/discord/flux'
import { useEffect, useState } from 'react'

type Rgba = [number, number, number, number]
type Role = 'backdrop' | 'tile' | 'circle'

// How the native "+" tile looks in Discord 349 (sampled from a screenshot). Used to find the
// theme color tokens it is made of, and as the fallback when no matching token can be found.
const NATIVE: Record<Role, string> = {
	backdrop: '#080613', // guild bar background
	tile: '#1B1424',
	circle: '#AC5BD3',
}

// How close (in RGB distance) a token must be to count as a match, and which names to prefer.
const TOLERANCE = 8
const PREFER: Record<Role, RegExp> = {
	backdrop: /^(BG|BACKGROUND)_/,
	tile: /^(BG|BACKGROUND)_/,
	circle: /BRAND/,
}

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

const distance = (x: Rgba, y: Rgba) => Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2])

const hex = ([r, g, b]: Rgba) =>
	`#${[r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')}`

const tokens = (): Record<string, any> => {
	try {
		const t: any = Tokens
		return t?.colors ?? t?.default?.colors ?? {}
	} catch {
		return {}
	}
}

const themeStore = (): any => {
	try {
		return (Stores as any).ThemeStore
	} catch {
		return undefined
	}
}

function resolveToken(token: unknown): string | undefined {
	try {
		const t: any = Tokens
		const resolve = (t?.meta ?? t?.default?.meta)?.resolveSemanticColor
		const value = resolve?.(themeStore()?.theme, token)
		return typeof value === 'string' ? value : undefined
	} catch {
		return undefined
	}
}

// Finds, for each part of the button, the theme token whose current color matches the native tile.
let matched: Partial<Record<Role, string>> | undefined

function calibrate(): Partial<Record<Role, string>> {
	const all = tokens()
	const found: Partial<Record<Role, string>> = {}

	const backdrop = parse(NATIVE.backdrop)!
	const current = Object.keys(all).flatMap(name => {
		const value = parse(resolveToken(all[name]))
		return value ? [{ name, color: flatten(value, backdrop) }] : []
	})

	for (const role of ['backdrop', 'tile', 'circle'] as Role[]) {
		const target = parse(NATIVE[role])!
		const close = current
			.map(({ name, color }) => ({ name, d: distance(color, target) }))
			.filter(s => s.d <= TOLERANCE)
			.sort((a, b) => a.d - b.d)
		const best = close.find(s => PREFER[role].test(s.name)) ?? close[0]
		if (best) found[role] = best.name
	}
	return found
}

function colorOf(role: Role): string {
	const name = matched?.[role]
	return (name && resolveToken(tokens()[name])) || NATIVE[role]
}

export function getThemeColors() {
	matched ??= calibrate()

	const tile = colorOf('tile')
	// The eye is cut out of the circle, so it takes the tile color. If the tile is translucent,
	// flatten it over the bar background so the cut-out is not see-through.
	const parsed = parse(tile)
	const glyph =
		parsed && parsed[3] < 1
			? hex(flatten(parsed, parse(colorOf('backdrop')) ?? parse(NATIVE.backdrop)!))
			: tile

	return { tile, circle: colorOf('circle'), glyph }
}

// Same as getThemeColors, but re-renders the component when the theme changes.
export function useThemeColors() {
	const [, bump] = useState(0)

	useEffect(() => {
		const store = themeStore()
		if (!store?.addChangeListener) return
		const listener = () => bump(n => n + 1)
		store.addChangeListener(listener)
		return () => store.removeChangeListener?.(listener)
	}, [])

	return getThemeColors()
}
