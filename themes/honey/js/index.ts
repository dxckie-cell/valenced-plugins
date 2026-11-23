/// <reference types="@valenced/themes-api" />

import { lazyColors } from '../../../shared/theme-kit'
import type { Look, Palette, Tone } from '../../../shared/theme-kit'

// Pale gold from the blonde hair in the references. Every surface and text colour shares its hue.
const primary = '#e9d28a'
const onPrimary = '#1f1904'

// Discord's greys become warm olive-umber: near-black for the dark bases, ivory for Light.
const tone: Tone = {
	greys: [
		['#000000', '#080602'],
		['#2f2e2b', '#110e05'],
		['#35332f', '#1a1607'],
		['#3c3a36', '#2b2512'],
		['#45433f', '#3e3823'],
		['#5d5b57', '#5a523b'],
		['#85837f', '#7f7a6a'],
		['#9a9894', '#a5a092'],
		['#aeaca8', '#bab6ab'],
		['#c7c6c4', '#d4d2c9'],
		['#f0eff0', '#eceae4'],
		['#f3f3f4', '#f4f2ee'],
		['#fbfbfb', '#f9f8f5'],
		['#ffffff', '#ffffff'],
	],
	// Red and green are the primary too, so errors, badges, voice and online states all match.
	hues: {
		red: primary,
		orange: '#d7c07a',
		yellow: '#e5d8b0',
		green: primary,
		teal: '#cbb367',
		blue: '#cbb367',
		blurple: '#cbb367',
		purple: '#cbb367',
		pink: '#cbb367',
	},
}

const night: Palette = {
	rail: '#110e05',
	floor: '#1a1607',
	panel: '#151107',
	page: '#201b0b',
	card: '#2b2512',
	popup: '#36301b',
	input: '#161208',
	control: '#3e3823',
	pressed: '#4b442e',

	heading: '#faf8f4',
	strong: '#f0ede5',
	text: '#d8d4c7',
	subtle: '#b0aa99',
	muted: '#898474',
	faint: '#605b4d',

	divider: '#ee7fae1a',
	border: '#ee7fae33',
	borderStrong: '#ee7fae59',

	accent: primary,
	accentPress: '#b0932d',
	onAccent: onPrimary,
	accentSoft: '#ee7fae26',
	accentText: '#d0c295',
	// Sits under Discord's white icons, so it is a deeper shade of the primary.
	brand: '#b0932d',
	rowIcon: primary,
	selection: '#ee7fae26',

	link: '#d0c295',
	mentionText: '#eae4d1',
	mentionPill: '#ee7fae33',
	mentionBg: '#ee7fae14',
	replyBg: '#ffffff0d',
	keyword: '#ee7fae40',
	code: '#0c0903',
	codeText: '#d0c295',
	spoiler: '#403a25',
	spoilerRevealed: '#2b2512',

	positive: primary,
	warning: '#e5d8b0',
	danger: primary,
	dangerFill: primary,
	scrim: '#0a0307cc',
}

const day: Palette = {
	rail: '#e7e3d6',
	floor: '#fbf9f5',
	panel: '#f0ede5',
	page: '#f0ede5',
	card: '#ffffff',
	popup: '#ffffff',
	input: '#ece8dd',
	control: '#e1ddcd',
	pressed: '#d2ccb7',

	heading: '#1e1806',
	strong: '#282109',
	text: '#3b3522',
	subtle: '#5f5a48',
	muted: '#77715e',
	faint: '#aaa595',

	divider: '#2a0c1c14',
	border: '#2a0c1c21',
	borderStrong: '#2a0c1c40',

	accent: primary,
	accentPress: '#b0932d',
	onAccent: onPrimary,
	accentSoft: '#ee7fae33',
	// The primary is too light for text on cream, so text and links use a deeper shade.
	accentText: '#7e6716',
	brand: '#b0932d',
	rowIcon: '#b0932d',
	selection: '#ee7fae26',

	link: '#64510c',
	mentionText: '#64510c',
	mentionPill: '#ee7fae40',
	mentionBg: '#ee7fae1f',
	replyBg: '#2a0c1c0a',
	keyword: '#ee7fae59',
	code: '#efede4',
	codeText: '#64510c',
	spoiler: '#cec9b9',
	spoilerRevealed: '#e1ddcd',

	positive: '#7e6716',
	warning: '#866e1a',
	danger: '#7e6716',
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
		MOBILE_TEXT_HEADING_PRIMARY: '#7e6716',
		INTERACTIVE_ICON_ACTIVE: '#7e6716',
		INTERACTIVE_ICON_HOVER: '#7e6716',
	},
}

export default plugin({
	preInit({ themes }) {
		themes.registerGroup('honey', {
			name: 'Honey',
			description: 'Dark umber with a pale honey-gold accent.',
		})
		themes.registerTheme('honey', 'honey', {
			name: 'Honey',
			description: 'Olive-umber surfaces with a blonde-gold accent, or an ivory day on Light.',
			getColors: lazyColors(tone, {
				dark,
				darker: dark,
				midnight: dark,
				light,
			}),
		})
	},
})
