/// <reference types="@valenced/themes-api" />

import { lazyColors } from '../../../shared/theme-kit'
import type { Look, Palette, Tone } from '../../../shared/theme-kit'

// Primary colour. Buttons, toggles, icons and highlights are this exact colour on both Dark and Light.
const primary = '#9595ff'
// Dark text on the primary colour: 7.3:1, where white would only reach 2.6:1.
const onPrimary = '#0d0d1f'

// Discord's greys become indigo-tinted: deep navy-violet for the dark bases, periwinkle-tinted white for Light.
const tone: Tone = {
	greys: [
		['#000000', '#010007'],
		['#2c2d32', '#090623'],
		['#323339', '#100d31'],
		['#393a41', '#1c1a40'],
		['#41434a', '#292850'],
		['#595a63', '#4a4b75'],
		['#81828a', '#76788f'],
		['#97979f', '#9a9cb4'],
		['#abacb2', '#b4b6d4'],
		['#c5c6ca', '#cdd0ea'],
		['#efeff1', '#e4e7fb'],
		['#f3f3f4', '#eff0ff'],
		['#fbfbfb', '#f7f8ff'],
		['#ffffff', '#ffffff'],
	],
	// Red and green are the primary too, so errors, badges, voice and online states all match.
	hues: {
		red: primary,
		orange: '#ee8a4a',
		yellow: '#eebb4a',
		green: primary,
		teal: '#45b5c8',
		blue: '#5a8ff0',
		blurple: '#8585fa',
		purple: '#b078f0',
		pink: '#e670c0',
	},
}

const night: Palette = {
	rail: '#090623',
	floor: '#100d31',
	panel: '#0c092a',
	page: '#141237',
	card: '#1c1a43',
	popup: '#23214b',
	input: '#120f34',
	control: '#272653',
	pressed: '#323162',

	heading: '#ffffff',
	strong: '#f0f1fa',
	text: '#d4d6e8',
	subtle: '#abaed1',
	muted: '#898bb3',
	faint: '#5d5f85',

	divider: '#9595ff1a',
	border: '#9595ff33',
	borderStrong: '#9595ff59',

	accent: primary,
	accentPress: '#8383f0',
	onAccent: onPrimary,
	accentSoft: '#9595ff26',
	accentText: '#b8b8ff',
	// Sits under Discord's white icons, so it is a deeper shade of the primary.
	brand: '#5c5ce0',
	rowIcon: '#9595ff',
	selection: '#9595ff26',

	link: '#b0b0ff',
	mentionText: '#d8d8ff',
	mentionPill: '#9595ff33',
	mentionBg: '#9595ff14',
	replyBg: '#ffffff0d',
	keyword: '#9595ff40',
	code: '#070421',
	codeText: '#b8b8ff',
	spoiler: '#303058',
	spoilerRevealed: '#1c1a43',

	positive: '#9595ff',
	warning: '#f0d28a',
	danger: '#9595ff',
	dangerFill: primary,
	scrim: '#050317cc',
}

const day: Palette = {
	rail: '#dadcf5',
	floor: '#f5f6ff',
	panel: '#e8eafc',
	page: '#e8eafc',
	card: '#ffffff',
	popup: '#ffffff',
	input: '#dfe1fa',
	control: '#d5d8f9',
	pressed: '#c4c7ee',

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
	code: '#e2e4fa',
	codeText: '#4343c8',
	spoiler: '#b8b8d4',
	spoilerRevealed: '#d5d8f9',

	positive: '#4a4ad0',
	warning: '#a07a1c',
	danger: '#4a4ad0',
	dangerFill: primary,
	scrim: '#15152a59',
}

// Green and red states all use the primary, with dark text on top. Do-not-disturb stays red so it
// still differs from online.
const states = {
	STATUS_POSITIVE: primary,
	STATUS_ONLINE: primary,
	STATUS_SPEAKING: primary,
	STATUS_DANGER: primary,
	STATUS_POSITIVE_BACKGROUND: primary,
	STATUS_POSITIVE_TEXT: onPrimary,
	ICON_STATUS_ONLINE: primary,
	TEXT_STATUS_ONLINE: primary,
	ICON_VOICE_CONNECTED: primary,
	ICON_VOICE_SPEAKING: primary,
	ICON_VOICE_MUTED: primary,
	ICON_VOICE_DISCONNECTED: primary,
	ICON_FEEDBACK_NOTIFICATION: primary,
	BADGE_SUCCESS_BACKGROUND: primary,
	BADGE_SUCCESS_TEXT: onPrimary,
	BADGE_NOTIFICATION_BACKGROUND: primary,
	BADGE_NOTIFICATION_TEXT: onPrimary,
	BADGE_CRITICAL_BACKGROUND: primary,
	BADGE_CRITICAL_TEXT: onPrimary,
	CONTROL_CRITICAL_PRIMARY_TEXT_DEFAULT: onPrimary,
	ICON_STATUS_DND: '#e0556a',
	TEXT_STATUS_DND: '#e0556a',
}

// Usernames without a role colour read Discord's heading colour. The active icon colour covers the server-list dots.
// Light uses a deeper shade, since the primary is too pale on white.
const dark: Look = {
	palette: night,
	extra: {
		...states,
		MOBILE_TEXT_HEADING_PRIMARY: primary,
		INTERACTIVE_ICON_ACTIVE: primary,
		INTERACTIVE_ICON_HOVER: primary,
	},
}
const light: Look = {
	palette: day,
	extra: {
		...states,
		MOBILE_TEXT_HEADING_PRIMARY: '#4a4ad0',
		INTERACTIVE_ICON_ACTIVE: '#4a4ad0',
		INTERACTIVE_ICON_HOVER: '#4a4ad0',
	},
}

export default plugin({
	preInit({ themes }) {
		themes.registerGroup('periwinkle', {
			name: 'Periwinkle',
			description: 'Soft violet-blue and deep indigo.',
		})
		themes.registerTheme('periwinkle', 'periwinkle', {
			name: 'Periwinkle',
			description: 'Deep indigo surfaces with soft periwinkle accents.',
			getColors: lazyColors(tone, {
				dark,
				darker: dark,
				midnight: dark,
				light,
			}),
		})
	},
})
