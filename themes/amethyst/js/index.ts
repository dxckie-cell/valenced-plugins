/// <reference types="@valenced/themes-api" />

import { lazyColors } from '../../../shared/theme-kit'
import type { Look, Palette, Tone } from '../../../shared/theme-kit'

// Violet from the hair in the references. Every surface and text colour shares its hue.
const primary = '#b388e6'
const onPrimary = '#0f0916'

// Discord's greys become deep violet: near-black aubergine for the dark bases, lilac-white for Light.
const tone: Tone = {
	greys: [
		['#000000', '#08050c'],
		['#2e2d30', '#100c15'],
		['#343237', '#191221'],
		['#3b393e', '#2a2134'],
		['#444247', '#3d344a'],
		['#5c5a5f', '#564c64'],
		['#848287', '#7d7687'],
		['#99979c', '#a29cab'],
		['#adabb0', '#b8b3c0'],
		['#c7c6c9', '#d4d0d9'],
		['#f0eff0', '#ece9f0'],
		['#f3f3f4', '#f3f1f6'],
		['#fbfbfb', '#f9f8fb'],
		['#ffffff', '#ffffff'],
	],
	// Red and green are the primary too, so errors, badges, voice and online states all match.
	hues: {
		red: primary,
		orange: '#b388e6',
		yellow: '#d9cceb',
		green: primary,
		teal: '#bdaad6',
		blue: '#bdaad6',
		blurple: '#bdaad6',
		purple: '#bdaad6',
		pink: '#bdaad6',
	},
}

const night: Palette = {
	rail: '#100c15',
	floor: '#191221',
	panel: '#140f1a',
	page: '#1f1827',
	card: '#2a2134',
	popup: '#342b40',
	input: '#15101b',
	control: '#3d344a',
	pressed: '#494056',

	heading: '#f9f7fc',
	strong: '#f0ecf5',
	text: '#d6d1df',
	subtle: '#aea6ba',
	muted: '#878091',
	faint: '#5d5866',

	divider: '#ee7fae1a',
	border: '#ee7fae33',
	borderStrong: '#ee7fae59',

	accent: primary,
	accentPress: '#9e8db5',
	onAccent: onPrimary,
	accentSoft: '#ee7fae26',
	accentText: '#cbb8e4',
	// Sits under Discord's white icons, so it is a deeper shade of the primary.
	brand: '#9e8db5',
	rowIcon: primary,
	selection: '#ee7fae26',

	link: '#cbb8e4',
	mentionText: '#e7dff3',
	mentionPill: '#ee7fae33',
	mentionBg: '#ee7fae14',
	replyBg: '#ffffff0d',
	keyword: '#ee7fae40',
	code: '#0c0811',
	codeText: '#cbb8e4',
	spoiler: '#3f364c',
	spoilerRevealed: '#2a2134',

	positive: primary,
	warning: '#d9cceb',
	danger: primary,
	dangerFill: primary,
	scrim: '#0a0307cc',
}

const day: Palette = {
	rail: '#e5e0ee',
	floor: '#f9f7fb',
	panel: '#f0ecf5',
	page: '#f0ecf5',
	card: '#ffffff',
	popup: '#ffffff',
	input: '#eae5f2',
	control: '#e0daea',
	pressed: '#d0c7dd',

	heading: '#1c1426',
	strong: '#261c32',
	text: '#3a3145',
	subtle: '#5d5668',
	muted: '#756d81',
	faint: '#a8a1b2',

	divider: '#2a0c1c14',
	border: '#2a0c1c21',
	borderStrong: '#2a0c1c40',

	accent: primary,
	accentPress: '#9e8db5',
	onAccent: onPrimary,
	accentSoft: '#ee7fae33',
	// The primary is too light for text on cream, so text and links use a deeper shade.
	accentText: '#716087',
	brand: '#9e8db5',
	rowIcon: '#9e8db5',
	selection: '#ee7fae26',

	link: '#5b4a70',
	mentionText: '#5b4a70',
	mentionPill: '#ee7fae40',
	mentionBg: '#ee7fae1f',
	replyBg: '#2a0c1c0a',
	keyword: '#ee7fae59',
	code: '#efebf4',
	codeText: '#5b4a70',
	spoiler: '#ccc5d6',
	spoilerRevealed: '#e0daea',

	positive: '#716087',
	warning: '#78678e',
	danger: '#716087',
	dangerFill: primary,
	scrim: '#2a0c1c59',
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
	ICON_STATUS_DND: '#e5484d',
	TEXT_STATUS_DND: '#e5484d',
}

// Usernames without a role colour read Discord's heading colour. The active icon colour covers the server-list dots.
// Light uses a deeper shade, since the primary is too pale on lilac.
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
		MOBILE_TEXT_HEADING_PRIMARY: '#716087',
		INTERACTIVE_ICON_ACTIVE: '#716087',
		INTERACTIVE_ICON_HOVER: '#716087',
	},
}

export default plugin({
	preInit({ themes }) {
		themes.registerGroup('amethyst', {
			name: 'Amethyst',
			description: 'Deep aubergine with a bright amethyst accent.',
		})
		themes.registerTheme('amethyst', 'amethyst', {
			name: 'Amethyst',
			description: 'Aubergine surfaces with an amethyst accent, or a lilac-white day on Light.',
			getColors: lazyColors(tone, {
				dark,
				darker: dark,
				midnight: dark,
				light,
			}),
		})
	},
})
