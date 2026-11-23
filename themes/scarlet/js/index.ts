/// <reference types="@valenced/themes-api" />

import { lazyColors } from '../../../shared/theme-kit'
import type { Look, Palette, Tone } from '../../../shared/theme-kit'

// Scarlet red from the hair in the references. Every surface and text colour shares its hue.
const primary = '#e63946'
const onPrimary = '#1d0306'

// Discord's greys become deep burgundy: near-black wine for the dark bases, rose-white for Light.
const tone: Tone = {
	greys: [
		['#000000', '#100304'],
		['#332c2d', '#1a0709'],
		['#3a3031', '#280b0f'],
		['#413738', '#3d181d'],
		['#4a4041', '#542a2f'],
		['#625859', '#714347'],
		['#8a8081', '#917072'],
		['#9f9596', '#b69799'],
		['#b3a9aa', '#c8afb1'],
		['#cac5c5', '#e0cdce'],
		['#f0eff0', '#f4e6e7'],
		['#f3f3f4', '#f9eff0'],
		['#fbfbfb', '#fdf7f7'],
		['#ffffff', '#ffffff'],
	],
	// Red and green are the primary too, so errors, badges, voice and online states all match.
	hues: {
		red: primary,
		orange: '#ff9aa5',
		yellow: '#ffc0c5',
		green: primary,
		teal: '#fc909b',
		blue: '#fc909b',
		blurple: '#fc909b',
		purple: '#fc909b',
		pink: '#fc909b',
	},
}

const night: Palette = {
	rail: '#1a0709',
	floor: '#280b0f',
	panel: '#1f0a0d',
	page: '#2f1014',
	card: '#3d181d',
	popup: '#4b2227',
	input: '#200b0e',
	control: '#542a2f',
	pressed: '#62363b',

	heading: '#fff5f6',
	strong: '#fae9ea',
	text: '#e8ccce',
	subtle: '#c49fa2',
	muted: '#9b7a7c',
	faint: '#6f5254',

	divider: '#ee7fae1a',
	border: '#ee7fae33',
	borderStrong: '#ee7fae59',

	accent: primary,
	accentPress: '#d9727d',
	onAccent: onPrimary,
	accentSoft: '#ee7fae26',
	accentText: '#ffa5ad',
	// Sits under Discord's white icons, so it is a deeper shade of the primary.
	brand: '#d9727d',
	rowIcon: primary,
	selection: '#ee7fae26',

	link: '#ffa5ad',
	mentionText: '#ffd8db',
	mentionPill: '#ee7fae33',
	mentionBg: '#ee7fae14',
	replyBg: '#ffffff0d',
	keyword: '#ee7fae40',
	code: '#150506',
	codeText: '#ffa5ad',
	spoiler: '#562c31',
	spoilerRevealed: '#3d181d',

	positive: primary,
	warning: '#ffc0c5',
	danger: primary,
	dangerFill: primary,
	scrim: '#0a0307cc',
}

const day: Palette = {
	rail: '#f7dbdd',
	floor: '#fff6f7',
	panel: '#fae9ea',
	page: '#fae9ea',
	card: '#ffffff',
	popup: '#ffffff',
	input: '#fae1e3',
	control: '#f5d4d6',
	pressed: '#ecbfc2',

	heading: '#2d0b10',
	strong: '#3c1017',
	text: '#4e292d',
	subtle: '#734e51',
	muted: '#8d6568',
	faint: '#be9b9d',

	divider: '#2a0c1c14',
	border: '#2a0c1c21',
	borderStrong: '#2a0c1c40',

	accent: primary,
	accentPress: '#d9727d',
	onAccent: onPrimary,
	accentSoft: '#ee7fae33',
	// The primary is too light for text on cream, so text and links use a deeper shade.
	accentText: '#a64452',
	brand: '#d9727d',
	rowIcon: '#d9727d',
	selection: '#ee7fae26',

	link: '#8c2c3d',
	mentionText: '#8c2c3d',
	mentionPill: '#ee7fae40',
	mentionBg: '#ee7fae1f',
	replyBg: '#2a0c1c0a',
	keyword: '#ee7fae59',
	code: '#fbe8e9',
	codeText: '#8c2c3d',
	spoiler: '#e2bfc1',
	spoilerRevealed: '#f5d4d6',

	positive: '#a64452',
	warning: '#ae4b59',
	danger: '#a64452',
	dangerFill: primary,
	scrim: '#2a0c1c59',
}

// Green and red states all use the primary, with dark text on top. Do-not-disturb is a pale rose so it
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
	ICON_STATUS_DND: '#ff9aa5',
	TEXT_STATUS_DND: '#ff9aa5',
}

// Usernames without a role colour read Discord's heading colour. The active icon colour covers the server-list dots.
// Light uses a deeper shade, since the primary is too pale on cream.
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
		MOBILE_TEXT_HEADING_PRIMARY: '#a64452',
		INTERACTIVE_ICON_ACTIVE: '#a64452',
		INTERACTIVE_ICON_HOVER: '#a64452',
	},
}

export default plugin({
	preInit({ themes }) {
		themes.registerGroup('scarlet', {
			name: 'Scarlet',
			description: 'Deep burgundy with a bold scarlet accent.',
		})
		themes.registerTheme('scarlet', 'scarlet', {
			name: 'Scarlet',
			description: 'Burgundy surfaces with a scarlet accent, or a rose-white day on Light.',
			getColors: lazyColors(tone, {
				dark,
				darker: dark,
				midnight: dark,
				light,
			}),
		})
	},
})
