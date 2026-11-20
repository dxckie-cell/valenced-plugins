/// <reference types="@valenced/themes-api" />

import { lazyColors } from '../../../shared/theme-kit'
import type { Look, Palette, Tone } from '../../../shared/theme-kit'

// Caramel brown from the median skin tone. Every surface and text colour shares its hue. Dark text on it reaches 5.4:1.
const primary = '#b58766'
const onPrimary = '#1d0f08'

// Discord's greys become cocoa browns: near-black espresso for the dark bases, cream for Light.
const tone: Tone = {
	greys: [
		['#000000', '#090200'],
		['#2c2d32', '#180c04'],
		['#323339', '#22150c'],
		['#393a41', '#312319'],
		['#41434a', '#423329'],
		['#595a63', '#594a3f'],
		['#81828a', '#82746b'],
		['#97979f', '#a3958c'],
		['#abacb2', '#b6b0ab'],
		['#c5c6ca', '#d0c9c4'],
		['#efeff1', '#ede6e1'],
		['#f3f3f4', '#f4ede8'],
		['#fbfbfb', '#fcf5f0'],
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
		blurple: '#9b6f4f',
		purple: '#9a6a9a',
		pink: '#d9729a',
	},
}

const night: Palette = {
	rail: '#170d06',
	floor: '#21150d',
	panel: '#1c1109',
	page: '#281b12',
	card: '#312319',
	popup: '#3c2d22',
	input: '#1d120a',
	control: '#433327',
	pressed: '#503e32',

	heading: '#f8f4f1',
	strong: '#f0eae6',
	text: '#dad0ca',
	subtle: '#b6a89e',
	muted: '#928378',
	faint: '#66584e',

	divider: '#b587661a',
	border: '#b5876633',
	borderStrong: '#b5876659',

	accent: primary,
	accentPress: '#9b6f4f',
	onAccent: onPrimary,
	accentSoft: '#b5876626',
	accentText: '#ddb498',
	// Sits under Discord's white icons, so it is a deeper shade of the primary.
	brand: '#9b6f4f',
	rowIcon: primary,
	selection: '#b5876626',

	link: '#ddb498',
	mentionText: '#e7d3c6',
	mentionPill: '#b5876633',
	mentionBg: '#b5876614',
	replyBg: '#ffffff0d',
	keyword: '#b5876640',
	code: '#130a04',
	codeText: '#ddb498',
	spoiler: '#443429',
	spoilerRevealed: '#312319',

	positive: '#8cc58a',
	warning: '#f0d28a',
	danger: '#f0958c',
	dangerFill: '#c2483f',
	scrim: '#0a0503cc',
}

const day: Palette = {
	rail: '#e5dcd6',
	floor: '#faf6f3',
	panel: '#f0eae6',
	page: '#f0eae6',
	card: '#ffffff',
	popup: '#ffffff',
	input: '#eae1db',
	control: '#e2d7cf',
	pressed: '#d2c4bb',

	heading: '#211207',
	strong: '#2b1b10',
	text: '#423226',
	subtle: '#615247',
	muted: '#77685e',
	faint: '#a89c94',

	divider: '#2a150c14',
	border: '#2a150c21',
	borderStrong: '#2a150c40',

	accent: primary,
	accentPress: '#9b6f4f',
	onAccent: onPrimary,
	accentSoft: '#b5876633',
	// The primary is too light for text on cream, so text and links use a deeper shade.
	accentText: '#865734',
	brand: '#9b6f4f',
	rowIcon: '#9b6f4f',
	selection: '#b5876626',

	link: '#734623',
	mentionText: '#734623',
	mentionPill: '#b5876640',
	mentionBg: '#b587661f',
	replyBg: '#2a150c0a',
	keyword: '#b5876659',
	code: '#f1eae5',
	codeText: '#734623',
	spoiler: '#c7bbb3',
	spoilerRevealed: '#e2d7cf',

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
