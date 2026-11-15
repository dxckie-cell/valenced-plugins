/// <reference types="@valenced/themes-api" />

import { lazyColors } from '../../../shared/theme-kit'
import type { Look, Palette, Tone } from '../../../shared/theme-kit'

// The chat background is the primary colour itself. Everything else is a lighter or darker shade of
// it, with deep indigo ink for text and buttons. Dark text on #9595ff reaches 7.6:1.
const primary = '#9595ff'

// Discord's dark greys (surfaces) become shades of the primary, and its light greys (text) become
// indigo ink, so any colour this theme does not set by name still reads on the periwinkle.
const tone: Tone = {
	greys: [
		['#000000', '#7a78da'],
		['#2c2d32', '#8281ea'],
		['#323339', primary],
		['#393a41', '#aaadff'],
		['#41434a', '#b1b4ff'],
		['#595a63', '#6a6ad0'],
		['#81828a', '#4a4aa8'],
		['#97979f', '#38388f'],
		['#abacb2', '#2a2a70'],
		['#c5c6ca', '#1e1e55'],
		['#efeff1', '#10103a'],
		['#f3f3f4', '#0c0c2a'],
		['#fbfbfb', '#08081e'],
		['#ffffff', '#05051a'],
	],
	// Darkened so they stay readable on the periwinkle.
	hues: {
		red: '#c2183f',
		orange: '#b4540a',
		yellow: '#8a6400',
		green: '#0f7a46',
		teal: '#0b6f80',
		blue: '#1f4fc2',
		blurple: '#23237a',
		purple: '#6a2cc2',
		pink: '#b8247f',
	},
}

// Light is the same look, but Discord's light greys are its surfaces and its dark greys its text.
const lightTone: Tone = {
	greys: [
		['#000000', '#05051a'],
		['#31333b', '#14143a'],
		['#5c5e66', '#25255a'],
		['#80848e', '#38388f'],
		['#a8abb2', '#6a6ad0'],
		['#d4d7dc', '#8281ea'],
		['#e3e5e8', primary],
		['#f2f3f5', '#a3a5ff'],
		['#ffffff', '#b1b4ff'],
	],
	hues: tone.hues,
}

const periwinkle: Palette = {
	rail: '#8281ea',
	floor: primary,
	panel: '#8887ed',
	page: '#9d9eff',
	card: '#aaadff',
	popup: '#c2c6ff',
	input: '#b1b4ff',
	control: '#a3a5ff',
	pressed: '#7472d3',

	heading: '#07071a',
	strong: '#0c0c26',
	text: '#12122f',
	subtle: '#1e1e55',
	muted: '#2a2a70',
	faint: '#3b3b86',

	divider: '#0d0d2a1a',
	border: '#0d0d2a2e',
	borderStrong: '#0d0d2a52',

	// The primary is the background, so buttons and toggles are deep indigo with white on top.
	accent: '#23237a',
	accentPress: '#1a1a5e',
	onAccent: '#ffffff',
	accentSoft: '#23237a2e',
	accentText: '#1a1a70',
	brand: '#23237a',
	rowIcon: '#1a1a70',
	selection: '#23237a26',

	link: '#14147a',
	mentionText: '#0d0d5a',
	mentionPill: '#23237a33',
	mentionBg: '#23237a1f',
	replyBg: '#ffffff26',
	keyword: '#ffffff40',
	code: '#8585e8',
	codeText: '#0d0d4a',
	spoiler: '#2a2a6a',
	spoilerRevealed: '#9191f5',

	positive: '#04401f',
	warning: '#463000',
	danger: '#650a1f',
	dangerFill: '#c2183f',
	scrim: '#0a0a2acc',
}

const dark: Look = { palette: periwinkle }
const light: Look = { palette: periwinkle, tone: lightTone }

export default plugin({
	preInit({ themes }) {
		themes.registerGroup('periwinkle', {
			name: 'Periwinkle',
			description: 'A #9595FF background with deep indigo ink.',
		})
		themes.registerTheme('periwinkle', 'periwinkle', {
			name: 'Periwinkle',
			description:
				'The whole app on #9595FF, with indigo text and buttons. Looks the same on every base.',
			getColors: lazyColors(tone, {
				dark,
				darker: dark,
				midnight: dark,
				light,
			}),
		})
	},
})
