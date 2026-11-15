/// <reference types="@valenced/themes-api" />

import { lazyColors } from '../../../shared/theme-kit'
import type { Look, Palette, Tone } from '../../../shared/theme-kit'

// Primary colour. Buttons, toggles and highlights are this exact colour on both Dark and Light.
const primary = '#9595ff'
// Dark text on the primary colour: 7.3:1, where white would only reach 2.6:1.
const onPrimary = '#0d0d1f'

// Discord's greys become indigo-tinted: near-black violet for the dark bases, lavender white for Light.
const tone: Tone = {
	greys: [
		['#000000', '#020209'],
		['#2c2d32', '#05050f'],
		['#323339', '#070713'],
		['#393a41', '#11111d'],
		['#41434a', '#171825'],
		['#595a63', '#2f303b'],
		['#81828a', '#6c6d7a'],
		['#97979f', '#9697a5'],
		['#abacb2', '#b0b1bf'],
		['#c5c6ca', '#cccddb'],
		['#efeff1', '#eaecfb'],
		['#f3f3f4', '#f3f4ff'],
		['#fbfbfb', '#f7f8ff'],
		['#ffffff', '#ffffff'],
	],
	// Status colours are tuned to sit next to the periwinkle without clashing.
	hues: {
		red: '#e0556a',
		orange: '#ee8a4a',
		yellow: '#eebb4a',
		green: '#3fb98a',
		teal: '#45b5c8',
		blue: '#5a8ff0',
		blurple: '#8585fa',
		purple: '#b078f0',
		pink: '#e670c0',
	},
}

const night: Palette = {
	rail: '#090917',
	floor: '#0e0e1d',
	panel: '#0c0c1b',
	page: '#121221',
	card: '#171726',
	popup: '#1b1b2b',
	input: '#111120',
	control: '#1f2030',
	pressed: '#292a3a',

	heading: '#ffffff',
	strong: '#f1f1fb',
	text: '#d6d6ea',
	subtle: '#a7a7c4',
	muted: '#8484a4',
	faint: '#5f5f7c',

	divider: '#c8c8ff14',
	border: '#c8c8ff24',
	borderStrong: '#c8c8ff40',

	accent: primary,
	accentPress: '#8383f0',
	onAccent: onPrimary,
	accentSoft: '#9595ff26',
	accentText: '#b8b8ff',
	// Sits under Discord's white icons, so it is a deeper shade of the primary.
	brand: '#5c5ce0',
	rowIcon: '#b8b8ff',
	selection: '#9595ff1f',

	link: '#b0b0ff',
	mentionText: '#d8d8ff',
	mentionPill: '#9595ff33',
	mentionBg: '#9595ff14',
	replyBg: '#ffffff0d',
	keyword: '#9595ff40',
	code: '#0e0e1b',
	codeText: '#b8b8ff',
	spoiler: '#2b2b45',
	spoilerRevealed: '#171726',

	positive: '#7fd9b0',
	warning: '#f0d28a',
	danger: '#f59aa8',
	dangerFill: '#c2405a',
	scrim: '#05050fcc',
}

const day: Palette = {
	rail: '#e9e9f8',
	floor: '#f7f7fe',
	panel: '#f1f1fb',
	page: '#f1f1fb',
	card: '#ffffff',
	popup: '#ffffff',
	input: '#e9e9f7',
	control: '#e3e3f4',
	pressed: '#d6d6ec',

	heading: '#0f0f1f',
	strong: '#15152a',
	text: '#2d2d48',
	subtle: '#51516e',
	muted: '#6b6b88',
	faint: '#9a9ab3',

	divider: '#1a1a3314',
	border: '#1a1a3321',
	borderStrong: '#1a1a3340',

	accent: primary,
	accentPress: '#8383f0',
	onAccent: onPrimary,
	accentSoft: '#9595ff33',
	// The primary is too light for text on white, so text and links use a deeper shade.
	accentText: '#4a4ad0',
	brand: '#5c5ce0',
	rowIcon: '#5c5ce0',
	selection: '#9595ff26',

	link: '#4343c8',
	mentionText: '#3a3ab8',
	mentionPill: '#9595ff40',
	mentionBg: '#9595ff1f',
	replyBg: '#15152a0a',
	keyword: '#9595ff59',
	code: '#ebebf8',
	codeText: '#4343c8',
	spoiler: '#b8b8d4',
	spoilerRevealed: '#e3e3f4',

	positive: '#1f8a5e',
	warning: '#a07a1c',
	danger: '#c0394f',
	dangerFill: '#c2405a',
	scrim: '#15152a59',
}

const dark: Look = { palette: night }
const light: Look = { palette: day }

export default plugin({
	preInit({ themes }) {
		themes.registerGroup('periwinkle', {
			name: 'Periwinkle',
			description: 'Soft violet-blue built around #9595FF.',
		})
		themes.registerTheme('periwinkle', 'periwinkle', {
			name: 'Periwinkle',
			description:
				'Deep indigo surfaces with #9595FF accents, or a lavender day on Light.',
			getColors: lazyColors(tone, {
				dark,
				darker: dark,
				midnight: dark,
				light,
			}),
		})
	},
})
