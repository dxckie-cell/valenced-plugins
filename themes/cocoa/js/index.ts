/// <reference types="@valenced/themes-api" />

import { lazyColors } from '../../../shared/theme-kit'
import type { Look, Palette, Tone } from '../../../shared/theme-kit'

// Caramel brown sampled from warm skin tones, over deep chocolate surfaces. Dark text on it reaches 5.4:1.
const primary = '#bb7a55'
const onPrimary = '#1d0f08'

// Discord's greys become cocoa browns: near-black espresso for the dark bases, cream for Light.
const tone: Tone = {
	greys: [
		['#000000', '#100806'],
		['#2c2d32', '#170d0a'],
		['#323339', '#1f1210'],
		['#393a41', '#2d1b17'],
		['#41434a', '#3a2520'],
		['#595a63', '#5f4137'],
		['#81828a', '#8c7063'],
		['#97979f', '#a98d80'],
		['#abacb2', '#c2a898'],
		['#c5c6ca', '#d8c3b6'],
		['#efeff1', '#f1e5db'],
		['#f3f3f4', '#f6ede5'],
		['#fbfbfb', '#fbf5f0'],
		['#ffffff', '#ffffff'],
	],
	// Status colours are warmed so they sit next to the brown without clashing.
	hues: {
		red: '#e0584f',
		orange: '#e8873a',
		yellow: '#e8b84a',
		green: '#6fae6a',
		teal: '#4aa8a0',
		blue: '#5a8fd0',
		blurple: '#a8693f',
		purple: '#9a6a9a',
		pink: '#d9729a',
	},
}

const night: Palette = {
	rail: '#170d0a',
	floor: '#1f1210',
	panel: '#1b0f0c',
	page: '#251612',
	card: '#2d1b17',
	popup: '#372420',
	input: '#1c100d',
	control: '#3d2823',
	pressed: '#4a312b',

	heading: '#fff7f1',
	strong: '#f6ebe3',
	text: '#e0cfc3',
	subtle: '#bba596',
	muted: '#977f70',
	faint: '#6e594d',

	divider: '#bb7a551a',
	border: '#bb7a5533',
	borderStrong: '#bb7a5559',

	accent: primary,
	accentPress: '#a8693f',
	onAccent: onPrimary,
	accentSoft: '#bb7a5526',
	accentText: '#e0b090',
	// Sits under Discord's white icons, so it is a deeper shade of the primary.
	brand: '#a8693f',
	rowIcon: primary,
	selection: '#bb7a5526',

	link: '#e0b090',
	mentionText: '#f0d2bc',
	mentionPill: '#bb7a5533',
	mentionBg: '#bb7a5514',
	replyBg: '#ffffff0d',
	keyword: '#bb7a5540',
	code: '#130a07',
	codeText: '#e0b090',
	spoiler: '#412b25',
	spoilerRevealed: '#2d1b17',

	positive: '#8cc58a',
	warning: '#f0d28a',
	danger: '#f0958c',
	dangerFill: '#c2483f',
	scrim: '#0a0503cc',
}

const day: Palette = {
	rail: '#ecdccf',
	floor: '#faf3ee',
	panel: '#f3e8df',
	page: '#f3e8df',
	card: '#ffffff',
	popup: '#ffffff',
	input: '#ebdbcd',
	control: '#e3d0c0',
	pressed: '#d3bba8',

	heading: '#2a150c',
	strong: '#33190e',
	text: '#4a2f22',
	subtle: '#6e5144',
	muted: '#8a6e60',
	faint: '#b39a8c',

	divider: '#2a150c14',
	border: '#2a150c21',
	borderStrong: '#2a150c40',

	accent: primary,
	accentPress: '#a8693f',
	onAccent: onPrimary,
	accentSoft: '#bb7a5533',
	// The primary is too light for text on cream, so text and links use a deeper shade.
	accentText: '#8a4f2c',
	brand: '#a8693f',
	rowIcon: '#a8693f',
	selection: '#bb7a5526',

	link: '#7a4222',
	mentionText: '#7a4222',
	mentionPill: '#bb7a5540',
	mentionBg: '#bb7a551f',
	replyBg: '#2a150c0a',
	keyword: '#bb7a5559',
	code: '#efe2d6',
	codeText: '#7a4222',
	spoiler: '#c9b2a2',
	spoilerRevealed: '#e3d0c0',

	positive: '#2f7a3a',
	warning: '#8a6310',
	danger: '#b3382f',
	dangerFill: '#c2483f',
	scrim: '#2a150c59',
}

const dark: Look = { palette: night }
const light: Look = { palette: day }

export default plugin({
	preInit({ themes }) {
		themes.registerGroup('cocoa', {
			name: 'Cocoa',
			description: 'Warm browns with a caramel accent.',
		})
		themes.registerTheme('cocoa', 'cocoa', {
			name: 'Cocoa',
			description: 'Espresso surfaces with a caramel accent, or a cream day on Light.',
			getColors: lazyColors(tone, {
				dark,
				darker: dark,
				midnight: dark,
				light,
			}),
		})
	},
})
