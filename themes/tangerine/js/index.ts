/// <reference types="@valenced/themes-api" />

import { lazyColors } from '../../../shared/theme-kit'
import type { Look, Palette, Tone } from '../../../shared/theme-kit'

// Orange from the hair in the references. Every surface and text colour shares its hue.
const primary = '#f4953a'
const onPrimary = '#2a1204'

// Discord's greys become toasted amber: near-black umber for the dark bases, apricot cream for Light.
const tone: Tone = {
	greys: [
		['#000000', '#0c0502'],
		['#302d2a', '#160c04'],
		['#37322e', '#211206'],
		['#3e3935', '#342010'],
		['#47423e', '#493220'],
		['#605a56', '#654d39'],
		['#87827e', '#877668'],
		['#9c9793', '#ad9d90'],
		['#b0aba7', '#c0b4aa'],
		['#c8c6c4', '#dad0c9'],
		['#f0eff0', '#f0e9e3'],
		['#f3f3f4', '#f6f1ed'],
		['#fbfbfb', '#fbf7f4'],
		['#ffffff', '#ffffff'],
	],
	// Red and green are the primary too, so errors, badges, voice and online states all match.
	hues: {
		red: primary,
		orange: '#f7b36a',
		yellow: '#f9d3a6',
		green: primary,
		teal: '#f0a060',
		blue: '#f0a060',
		blurple: '#f0a060',
		purple: '#f0a060',
		pink: '#f0a060',
	},
}

const night: Palette = {
	rail: '#160c04',
	floor: '#211206',
	panel: '#1a0f06',
	page: '#281709',
	card: '#342010',
	popup: '#402b19',
	input: '#1b1006',
	control: '#493220',
	pressed: '#573f2b',

	heading: '#fdf7f3',
	strong: '#f5ece5',
	text: '#e0d1c6',
	subtle: '#baa697',
	muted: '#928072',
	faint: '#68584a',

	divider: '#ee7fae1a',
	border: '#ee7fae33',
	borderStrong: '#ee7fae59',

	accent: primary,
	accentPress: '#d97a1f',
	onAccent: onPrimary,
	accentSoft: '#ee7fae26',
	accentText: '#e8b790',
	// Sits under Discord's white icons, so it is a deeper shade of the primary.
	brand: '#d97a1f',
	rowIcon: primary,
	selection: '#ee7fae26',

	link: '#e8b790',
	mentionText: '#f5dfcf',
	mentionPill: '#ee7fae33',
	mentionBg: '#ee7fae14',
	replyBg: '#ffffff0d',
	keyword: '#ee7fae40',
	code: '#100803',
	codeText: '#e8b790',
	spoiler: '#4b3523',
	spoilerRevealed: '#342010',

	positive: primary,
	warning: '#f9d3a6',
	danger: primary,
	dangerFill: primary,
	scrim: '#0a0307cc',
}

const day: Palette = {
	rail: '#eee0d5',
	floor: '#fdf8f4',
	panel: '#f5ece5',
	page: '#f5ece5',
	card: '#ffffff',
	popup: '#ffffff',
	input: '#f2e6dc',
	control: '#ead9cb',
	pressed: '#dec7b5',

	heading: '#261404',
	strong: '#321b06',
	text: '#453120',
	subtle: '#695546',
	muted: '#816d5c',
	faint: '#b3a193',

	divider: '#2a0c1c14',
	border: '#2a0c1c21',
	borderStrong: '#2a0c1c40',

	accent: primary,
	accentPress: '#d97a1f',
	onAccent: onPrimary,
	accentSoft: '#ee7fae33',
	// The primary is too light for text on cream, so text and links use a deeper shade.
	accentText: '#9c5500',
	brand: '#d97a1f',
	rowIcon: '#d97a1f',
	selection: '#ee7fae26',

	link: '#7e4100',
	mentionText: '#7e4100',
	mentionPill: '#ee7fae40',
	mentionBg: '#ee7fae1f',
	replyBg: '#2a0c1c0a',
	keyword: '#ee7fae59',
	code: '#f5ebe4',
	codeText: '#7e4100',
	spoiler: '#d7c5b7',
	spoilerRevealed: '#ead9cb',

	positive: '#9c5500',
	warning: '#a65a0c',
	danger: '#9c5500',
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
	ICON_STATUS_DND: '#d93a32',
	TEXT_STATUS_DND: '#d93a32',
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
		MOBILE_TEXT_HEADING_PRIMARY: '#9c5500',
		INTERACTIVE_ICON_ACTIVE: '#9c5500',
		INTERACTIVE_ICON_HOVER: '#9c5500',
	},
}

export default plugin({
	preInit({ themes }) {
		themes.registerGroup('tangerine', {
			name: 'Tangerine',
			description: 'Dark umber with a bright tangerine accent.',
		})
		themes.registerTheme('tangerine', 'tangerine', {
			name: 'Tangerine',
			description: 'Burnt-umber surfaces with a tangerine accent, or a cream day on Light.',
			getColors: lazyColors(tone, {
				dark,
				darker: dark,
				midnight: dark,
				light,
			}),
		})
	},
})
