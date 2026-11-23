/// <reference types="@valenced/themes-api" />

import { lazyColors } from '../../../shared/theme-kit'
import type { Look, Palette, Tone } from '../../../shared/theme-kit'

// Fresh green from the hair in the references. Every surface and text colour shares its hue.
const primary = '#6fc46e'
const onPrimary = '#050f06'

// Discord's greys become deep forest: near-black green for the dark bases, mint-white for Light.
const tone: Tone = {
	greys: [
		['#000000', '#040804'],
		['#2c2e2c', '#091009'],
		['#303431', '#0d190e'],
		['#373b38', '#1c2a1c'],
		['#404441', '#2d3e2e'],
		['#585c59', '#465746'],
		['#808481', '#717e72'],
		['#959996', '#98a399'],
		['#a9ada9', '#b0b9b0'],
		['#c5c7c5', '#ced4ce'],
		['#f0eff0', '#e7ece7'],
		['#f3f3f4', '#eff3ef'],
		['#fbfbfb', '#f7f9f7'],
		['#ffffff', '#ffffff'],
	],
	// Red and green are the primary too, so errors, badges, voice and online states all match.
	hues: {
		red: primary,
		orange: '#6fc46e',
		yellow: '#c3dac4',
		green: primary,
		teal: '#9ebe9f',
		blue: '#9ebe9f',
		blurple: '#9ebe9f',
		purple: '#9ebe9f',
		pink: '#9ebe9f',
	},
}

const night: Palette = {
	rail: '#091009',
	floor: '#0d190e',
	panel: '#0c140c',
	page: '#131f14',
	card: '#1c2a1c',
	popup: '#253526',
	input: '#0d150d',
	control: '#2d3e2e',
	pressed: '#394a3a',

	heading: '#f5f9f5',
	strong: '#eaf0ea',
	text: '#cdd7cd',
	subtle: '#a1afa1',
	muted: '#7b887c',
	faint: '#545e54',

	divider: '#ee7fae1a',
	border: '#ee7fae33',
	borderStrong: '#ee7fae59',

	accent: primary,
	accentPress: '#819f82',
	onAccent: onPrimary,
	accentSoft: '#ee7fae26',
	accentText: '#acccad',
	// Sits under Discord's white icons, so it is a deeper shade of the primary.
	brand: '#819f82',
	rowIcon: primary,
	selection: '#ee7fae26',

	link: '#acccad',
	mentionText: '#dae8da',
	mentionPill: '#ee7fae33',
	mentionBg: '#ee7fae14',
	replyBg: '#ffffff0d',
	keyword: '#ee7fae40',
	code: '#060c06',
	codeText: '#acccad',
	spoiler: '#2f4030',
	spoilerRevealed: '#1c2a1c',

	positive: primary,
	warning: '#c3dac4',
	danger: primary,
	dangerFill: primary,
	scrim: '#0a0307cc',
}

const day: Palette = {
	rail: '#dce6dc',
	floor: '#f6f9f6',
	panel: '#eaf0ea',
	page: '#eaf0ea',
	card: '#ffffff',
	popup: '#ffffff',
	input: '#e2ebe2',
	control: '#d5e1d5',
	pressed: '#c1d1c1',

	heading: '#0e1c0f',
	strong: '#152616',
	text: '#2c3a2c',
	subtle: '#505e51',
	muted: '#677667',
	faint: '#9ca99d',

	divider: '#2a0c1c14',
	border: '#2a0c1c21',
	borderStrong: '#2a0c1c40',

	accent: primary,
	accentPress: '#819f82',
	onAccent: onPrimary,
	accentSoft: '#ee7fae33',
	// The primary is too light for text on cream, so text and links use a deeper shade.
	accentText: '#557256',
	brand: '#819f82',
	rowIcon: '#819f82',
	selection: '#ee7fae26',

	link: '#3f5c41',
	mentionText: '#3f5c41',
	mentionPill: '#ee7fae40',
	mentionBg: '#ee7fae1f',
	replyBg: '#2a0c1c0a',
	keyword: '#ee7fae59',
	code: '#e9efe9',
	codeText: '#3f5c41',
	spoiler: '#c0cdc1',
	spoilerRevealed: '#d5e1d5',

	positive: '#557256',
	warning: '#5c795d',
	danger: '#557256',
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
// Light uses a deeper shade, since the primary is too pale on mint.
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
		MOBILE_TEXT_HEADING_PRIMARY: '#557256',
		INTERACTIVE_ICON_ACTIVE: '#557256',
		INTERACTIVE_ICON_HOVER: '#557256',
	},
}

export default plugin({
	preInit({ themes }) {
		themes.registerGroup('verdant', {
			name: 'Verdant',
			description: 'Deep forest green with a fresh green accent.',
		})
		themes.registerTheme('verdant', 'verdant', {
			name: 'Verdant',
			description: 'Forest surfaces with a fresh green accent, or a mint-white day on Light.',
			getColors: lazyColors(tone, {
				dark,
				darker: dark,
				midnight: dark,
				light,
			}),
		})
	},
})
