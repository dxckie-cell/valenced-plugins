/// <reference types="@valenced/themes-api" />

import { lazyColors } from '../../../shared/theme-kit'
import type { Look, Palette, Tone } from '../../../shared/theme-kit'

// Violet from the hair in the references. Every surface and text colour shares its hue.
const primary = '#b388e6'
const onPrimary = '#0e081a'

// Discord's greys become deep violet: near-black aubergine for the dark bases, lilac-white for Light.
const tone: Tone = {
	greys: [
		['#000000', '#07050e'],
		['#2e2d31', '#0f0c18'],
		['#343239', '#181125'],
		['#3b3940', '#29203a'],
		['#444249', '#3c3350'],
		['#5c5a61', '#554b6b'],
		['#848289', '#7c768c'],
		['#99979e', '#a19cb0'],
		['#adabb2', '#b7b3c4'],
		['#c7c6ca', '#d3d0dc'],
		['#f0eff0', '#ebe9f2'],
		['#f3f3f4', '#f3f1f8'],
		['#fbfbfb', '#f9f8fc'],
		['#ffffff', '#ffffff'],
	],
	// Red and green are the primary too, so errors, badges, voice and online states all match.
	hues: {
		red: primary,
		orange: '#b388e6',
		yellow: '#d7cbf5',
		green: primary,
		teal: '#baa9e1',
		blue: '#baa9e1',
		blurple: '#baa9e1',
		purple: '#baa9e1',
		pink: '#baa9e1',
	},
}

const night: Palette = {
	rail: '#0f0c18',
	floor: '#181125',
	panel: '#130f1d',
	page: '#1e172c',
	card: '#29203a',
	popup: '#332a46',
	input: '#14101e',
	control: '#3c3350',
	pressed: '#483f5c',

	heading: '#f9f7fe',
	strong: '#efecf8',
	text: '#d5d1e3',
	subtle: '#ada5c0',
	muted: '#868096',
	faint: '#5d576a',

	divider: '#ee7fae1a',
	border: '#ee7fae33',
	borderStrong: '#ee7fae59',

	accent: primary,
	accentPress: '#9c8cc1',
	onAccent: onPrimary,
	accentSoft: '#ee7fae26',
	accentText: '#c8b7ef',
	// Sits under Discord's white icons, so it is a deeper shade of the primary.
	brand: '#9c8cc1',
	rowIcon: primary,
	selection: '#ee7fae26',

	link: '#c8b7ef',
	mentionText: '#e6dff9',
	mentionPill: '#ee7fae33',
	mentionBg: '#ee7fae14',
	replyBg: '#ffffff0d',
	keyword: '#ee7fae40',
	code: '#0b0814',
	codeText: '#c8b7ef',
	spoiler: '#3e3552',
	spoilerRevealed: '#29203a',

	positive: primary,
	warning: '#d7cbf5',
	danger: primary,
	dangerFill: primary,
	scrim: '#0a0307cc',
}

const day: Palette = {
	rail: '#e4e0f2',
	floor: '#f8f7fc',
	panel: '#efecf8',
	page: '#efecf8',
	card: '#ffffff',
	popup: '#ffffff',
	input: '#e9e5f6',
	control: '#dfdaef',
	pressed: '#cec6e4',

	heading: '#1b132b',
	strong: '#251b38',
	text: '#39304b',
	subtle: '#5c556d',
	muted: '#746c87',
	faint: '#a7a1b7',

	divider: '#2a0c1c14',
	border: '#2a0c1c21',
	borderStrong: '#2a0c1c40',

	accent: primary,
	accentPress: '#9c8cc1',
	onAccent: onPrimary,
	accentSoft: '#ee7fae33',
	// The primary is too light for text on cream, so text and links use a deeper shade.
	accentText: '#6f5f91',
	brand: '#9c8cc1',
	rowIcon: '#9c8cc1',
	selection: '#ee7fae26',

	link: '#594979',
	mentionText: '#594979',
	mentionPill: '#ee7fae40',
	mentionBg: '#ee7fae1f',
	replyBg: '#2a0c1c0a',
	keyword: '#ee7fae59',
	code: '#eeebf7',
	codeText: '#594979',
	spoiler: '#cbc5db',
	spoilerRevealed: '#dfdaef',

	positive: '#6f5f91',
	warning: '#766699',
	danger: '#6f5f91',
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
		MOBILE_TEXT_HEADING_PRIMARY: '#6f5f91',
		INTERACTIVE_ICON_ACTIVE: '#6f5f91',
		INTERACTIVE_ICON_HOVER: '#6f5f91',
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
