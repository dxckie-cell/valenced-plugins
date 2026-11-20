/// <reference types="@valenced/themes-api" />

import { lazyColors } from '../../../shared/theme-kit'
import type { Look, Palette, Tone } from '../../../shared/theme-kit'

// Rose pink from the pink hair in the references. Every surface and text colour shares its hue. Dark text on it reaches 7:1.
const primary = '#ee7fae'
const onPrimary = '#2a0716'

// Discord's greys become mulberry rose: near-black plum for the dark bases, blush for Light.
const tone: Tone = {
	greys: [
		['#000000', '#0e0307'],
		['#312c2e', '#19080f'],
		['#383134', '#250d17'],
		['#40383b', '#391927'],
		['#494144', '#502a3a'],
		['#62585b', '#6c4454'],
		['#898083', '#8d707a'],
		['#9e9598', '#b397a1'],
		['#b1aaad', '#c4b0b7'],
		['#c9c5c6', '#ddcdd3'],
		['#f1efef', '#f3e6ea'],
		['#f3f3f4', '#f8eff2'],
		['#fbfbfb', '#fdf6f8'],
		['#ffffff', '#ffffff'],
	],
	// Red and green are the primary too, so errors, badges, voice and online states all match.
	hues: {
		red: primary,
		orange: '#f0907a',
		yellow: '#f0b8a0',
		green: primary,
		teal: '#d98ac0',
		blue: '#d078b8',
		blurple: '#c24d84',
		purple: '#c06ab0',
		pink: '#ee7fae',
	},
}

const night: Palette = {
	rail: '#19080f',
	floor: '#250d17',
	panel: '#1e0a13',
	page: '#2d111d',
	card: '#391927',
	popup: '#462332',
	input: '#1f0b14',
	control: '#502a3a',
	pressed: '#5e3646',

	heading: '#fff5f8',
	strong: '#f9e9ee',
	text: '#e5cdd5',
	subtle: '#c1a0ac',
	muted: '#997a85',
	faint: '#6e525c',

	divider: '#ee7fae1a',
	border: '#ee7fae33',
	borderStrong: '#ee7fae59',

	accent: primary,
	accentPress: '#c24d84',
	onAccent: onPrimary,
	accentSoft: '#ee7fae26',
	accentText: '#f7a6c6',
	// Sits under Discord's white icons, so it is a deeper shade of the primary.
	brand: '#c24d84',
	rowIcon: primary,
	selection: '#ee7fae26',

	link: '#f7a6c6',
	mentionText: '#fcd9e5',
	mentionPill: '#ee7fae33',
	mentionBg: '#ee7fae14',
	replyBg: '#ffffff0d',
	keyword: '#ee7fae40',
	code: '#13050a',
	codeText: '#f7a6c6',
	spoiler: '#512d3c',
	spoilerRevealed: '#391927',

	positive: primary,
	warning: '#f6c4a8',
	danger: primary,
	dangerFill: primary,
	scrim: '#0a0307cc',
}

const day: Palette = {
	rail: '#f3dce4',
	floor: '#fff6f9',
	panel: '#f9e9ee',
	page: '#f9e9ee',
	card: '#ffffff',
	popup: '#ffffff',
	input: '#f7e2e9',
	control: '#f1d3dd',
	pressed: '#e6bfcd',

	heading: '#2b0c1a',
	strong: '#381123',
	text: '#4b2a37',
	subtle: '#704f5b',
	muted: '#886673',
	faint: '#ba9ba6',

	divider: '#2a0c1c14',
	border: '#2a0c1c21',
	borderStrong: '#2a0c1c40',

	accent: primary,
	accentPress: '#c24d84',
	onAccent: onPrimary,
	accentSoft: '#ee7fae33',
	// The primary is too light for text on blush, so text and links use a deeper shade.
	accentText: '#ad356f',
	brand: '#c24d84',
	rowIcon: '#c24d84',
	selection: '#ee7fae26',

	link: '#8d2458',
	mentionText: '#8d2458',
	mentionPill: '#ee7fae40',
	mentionBg: '#ee7fae1f',
	replyBg: '#2a0c1c0a',
	keyword: '#ee7fae59',
	code: '#f9e8ee',
	codeText: '#8d2458',
	spoiler: '#debfca',
	spoilerRevealed: '#f1d3dd',

	positive: '#ad356f',
	warning: '#8a6310',
	danger: '#ad356f',
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
	ICON_STATUS_DND: '#e8453c',
	TEXT_STATUS_DND: '#e8453c',
}

// Usernames without a role colour read Discord's heading colour. The active icon colour covers the server-list dots.
// Light uses a deeper shade, since the primary is too pale on blush.
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
		MOBILE_TEXT_HEADING_PRIMARY: '#ad356f',
		INTERACTIVE_ICON_ACTIVE: '#ad356f',
		INTERACTIVE_ICON_HOVER: '#ad356f',
	},
}

export default plugin({
	preInit({ themes }) {
		themes.registerGroup('rose', {
			name: 'Rose',
			description: 'Plum darks with a bold rose accent.',
		})
		themes.registerTheme('rose', 'rose', {
			name: 'Rose',
			description: 'Deep plum surfaces with a rose accent, or a blush day on Light.',
			getColors: lazyColors(tone, {
				dark,
				darker: dark,
				midnight: dark,
				light,
			}),
		})
	},
})
