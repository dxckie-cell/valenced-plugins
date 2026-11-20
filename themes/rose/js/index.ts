/// <reference types="@valenced/themes-api" />

import { lazyColors } from '../../../shared/theme-kit'
import type { Look, Palette, Tone } from '../../../shared/theme-kit'

// Rose pink from the pink hair in the references. Every surface and text colour shares its hue. Dark text on it reaches 7:1.
const primary = '#ee7fae'
const onPrimary = '#2a0716'

// Discord's greys become mulberry rose: near-black plum for the dark bases, blush for Light.
const tone: Tone = {
	greys: [
		['#000000', '#0d0309'],
		['#2c2d32', '#180812'],
		['#323339', '#230d1b'],
		['#393a41', '#371a2c'],
		['#41434a', '#4d2b40'],
		['#595a63', '#6a4458'],
		['#81828a', '#8a7080'],
		['#97979f', '#b098a8'],
		['#abacb2', '#c2b0ba'],
		['#c5c6ca', '#dccdd5'],
		['#efeff1', '#f2e6ec'],
		['#f3f3f4', '#f8eff3'],
		['#fbfbfb', '#fdf6f9'],
		['#ffffff', '#ffffff'],
	],
	// Red and green are the primary too, so errors, badges, voice and online states all match.
	hues: {
		red: primary,
		orange: '#e8873a',
		yellow: '#e8b84a',
		green: primary,
		teal: '#4aa8a0',
		blue: '#5a8fd0',
		blurple: '#c24d84',
		purple: '#a96ac0',
		pink: '#ee7fae',
	},
}

const night: Palette = {
	rail: '#180812',
	floor: '#230d1b',
	panel: '#1d0a16',
	page: '#2b1222',
	card: '#371a2c',
	popup: '#432438',
	input: '#1e0b17',
	control: '#4d2b40',
	pressed: '#5b374d',

	heading: '#fff5f9',
	strong: '#f8e9f0',
	text: '#e4cdd8',
	subtle: '#bfa0b0',
	muted: '#977a8a',
	faint: '#6c5260',

	divider: '#ee7fae1a',
	border: '#ee7fae33',
	borderStrong: '#ee7fae59',

	accent: primary,
	accentPress: '#c24d84',
	onAccent: onPrimary,
	accentSoft: '#ee7fae26',
	accentText: '#f6a6c8',
	// Sits under Discord's white icons, so it is a deeper shade of the primary.
	brand: '#c24d84',
	rowIcon: primary,
	selection: '#ee7fae26',

	link: '#f6a6c8',
	mentionText: '#fbd9e8',
	mentionPill: '#ee7fae33',
	mentionBg: '#ee7fae14',
	replyBg: '#ffffff0d',
	keyword: '#ee7fae40',
	code: '#12050c',
	codeText: '#f6a6c8',
	spoiler: '#4f2e42',
	spoilerRevealed: '#371a2c',

	positive: primary,
	warning: '#f0d28a',
	danger: primary,
	dangerFill: primary,
	scrim: '#0a0307cc',
}

const day: Palette = {
	rail: '#f2dce7',
	floor: '#fff6fa',
	panel: '#f8e9f0',
	page: '#f8e9f0',
	card: '#ffffff',
	popup: '#ffffff',
	input: '#f6e2ec',
	control: '#efd3e1',
	pressed: '#e3bfd2',

	heading: '#2a0c1c',
	strong: '#35122a',
	text: '#4a2a3b',
	subtle: '#6e4f5f',
	muted: '#84677a',
	faint: '#b79bab',

	divider: '#2a0c1c14',
	border: '#2a0c1c21',
	borderStrong: '#2a0c1c40',

	accent: primary,
	accentPress: '#c24d84',
	onAccent: onPrimary,
	accentSoft: '#ee7fae33',
	// The primary is too light for text on blush, so text and links use a deeper shade.
	accentText: '#b03466',
	brand: '#c24d84',
	rowIcon: '#c24d84',
	selection: '#ee7fae26',

	link: '#8f2350',
	mentionText: '#8f2350',
	mentionPill: '#ee7fae40',
	mentionBg: '#ee7fae1f',
	replyBg: '#2a0c1c0a',
	keyword: '#ee7fae59',
	code: '#f8e8f0',
	codeText: '#8f2350',
	spoiler: '#dcbfce',
	spoilerRevealed: '#efd3e1',

	positive: '#b03466',
	warning: '#8a6310',
	danger: '#b03466',
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
		MOBILE_TEXT_HEADING_PRIMARY: '#b03466',
		INTERACTIVE_ICON_ACTIVE: '#b03466',
		INTERACTIVE_ICON_HOVER: '#b03466',
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
