/// <reference types="@valenced/themes-api" />

import { lazyColors } from '../../../shared/theme-kit'
import type { Look, Palette, Tone } from '../../../shared/theme-kit'

// Scarlet red from the hair in the references. Every surface and text colour shares its hue.
const primary = '#e63946'
const onPrimary = '#1a0505'

// Discord's greys become deep burgundy: near-black wine for the dark bases, rose-white for Light.
const tone: Tone = {
	greys: [
		['#000000', '#0e0404'],
		['#322d2c', '#180909'],
		['#393131', '#250e0e'],
		['#403838', '#391c1b'],
		['#494141', '#4f2e2d'],
		['#615959', '#6c4745'],
		['#898181', '#8d7271'],
		['#9e9696', '#b29998'],
		['#b2aaaa', '#c5b1b0'],
		['#c9c5c5', '#ddcecd'],
		['#f0eff0', '#f2e7e7'],
		['#f3f3f4', '#f8f0f0'],
		['#fbfbfb', '#fcf7f6'],
		['#ffffff', '#ffffff'],
	],
	// Red and green are the primary too, so errors, badges, voice and online states all match.
	hues: {
		red: primary,
		orange: '#ffa19e',
		yellow: '#ffc5c2',
		green: primary,
		teal: '#f89591',
		blue: '#f89591',
		blurple: '#f89591',
		purple: '#f89591',
		pink: '#f89591',
	},
}

const night: Palette = {
	rail: '#180909',
	floor: '#250e0e',
	panel: '#1d0c0c',
	page: '#2c1313',
	card: '#391c1b',
	popup: '#472625',
	input: '#1e0d0d',
	control: '#4f2e2d',
	pressed: '#5d3a38',

	heading: '#fef6f6',
	strong: '#f8eae9',
	text: '#e4cecc',
	subtle: '#bfa2a0',
	muted: '#977c7b',
	faint: '#6b5453',

	divider: '#ee7fae1a',
	border: '#ee7fae33',
	borderStrong: '#ee7fae59',

	accent: primary,
	accentPress: '#d67674',
	onAccent: onPrimary,
	accentSoft: '#ee7fae26',
	accentText: '#f5aca9',
	// Sits under Discord's white icons, so it is a deeper shade of the primary.
	brand: '#d67674',
	rowIcon: primary,
	selection: '#ee7fae26',

	link: '#f5aca9',
	mentionText: '#fcdbd9',
	mentionPill: '#ee7fae33',
	mentionBg: '#ee7fae14',
	replyBg: '#ffffff0d',
	keyword: '#ee7fae40',
	code: '#130606',
	codeText: '#f5aca9',
	spoiler: '#51302f',
	spoilerRevealed: '#391c1b',

	positive: primary,
	warning: '#ffc5c2',
	danger: primary,
	dangerFill: primary,
	scrim: '#0a0307cc',
}

const day: Palette = {
	rail: '#f3dddb',
	floor: '#fff7f7',
	panel: '#f8eae9',
	page: '#f8eae9',
	card: '#ffffff',
	popup: '#ffffff',
	input: '#f7e3e2',
	control: '#f1d6d4',
	pressed: '#e6c2c0',

	heading: '#2a0f0f',
	strong: '#381515',
	text: '#4a2c2b',
	subtle: '#6f5150',
	muted: '#886866',
	faint: '#b99d9c',

	divider: '#2a0c1c14',
	border: '#2a0c1c21',
	borderStrong: '#2a0c1c40',

	accent: primary,
	accentPress: '#d67674',
	onAccent: onPrimary,
	accentSoft: '#ee7fae33',
	// The primary is too light for text on cream, so text and links use a deeper shade.
	accentText: '#a34949',
	brand: '#d67674',
	rowIcon: '#d67674',
	selection: '#ee7fae26',

	link: '#893234',
	mentionText: '#893234',
	mentionPill: '#ee7fae40',
	mentionBg: '#ee7fae1f',
	replyBg: '#2a0c1c0a',
	keyword: '#ee7fae59',
	code: '#f8e9e8',
	codeText: '#893234',
	spoiler: '#ddc1c0',
	spoilerRevealed: '#f1d6d4',

	positive: '#a34949',
	warning: '#ab5050',
	danger: '#a34949',
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
		MOBILE_TEXT_HEADING_PRIMARY: '#a34949',
		INTERACTIVE_ICON_ACTIVE: '#a34949',
		INTERACTIVE_ICON_HOVER: '#a34949',
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
