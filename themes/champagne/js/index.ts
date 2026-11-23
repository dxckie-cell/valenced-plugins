/// <reference types="@valenced/themes-api" />

import { lazyColors } from '../../../shared/theme-kit'
import type { Look, Palette, Tone } from '../../../shared/theme-kit'

// Pale blonde from the hair in the references. Every surface and text colour shares its hue.
const primary = '#eed3a0'
const onPrimary = '#221804'

// Discord's greys become warm olive-umber: near-black for the dark bases, ivory for Light.
const tone: Tone = {
	greys: [
		['#000000', '#090602'],
		['#2f2e2b', '#120d05'],
		['#35332f', '#1c1507'],
		['#3c3a36', '#2d2412'],
		['#45433f', '#413723'],
		['#5d5b57', '#5c513b'],
		['#85837f', '#81796a'],
		['#9a9894', '#a79f92'],
		['#aeaca8', '#bbb6ab'],
		['#c7c6c4', '#d6d1c9'],
		['#f0eff0', '#edeae4'],
		['#f3f3f4', '#f4f2ee'],
		['#fbfbfb', '#f9f8f5'],
		['#ffffff', '#ffffff'],
	],
	// Red and green are the primary too, so errors, badges, voice and online states all match.
	hues: {
		red: primary,
		orange: '#dfbc7a',
		yellow: '#ead6b0',
		green: primary,
		teal: '#d3af67',
		blue: '#d3af67',
		blurple: '#d3af67',
		purple: '#d3af67',
		pink: '#d3af67',
	},
}

const night: Palette = {
	rail: '#120d05',
	floor: '#1c1507',
	panel: '#161107',
	page: '#221a0b',
	card: '#2d2412',
	popup: '#392f1b',
	input: '#171208',
	control: '#413723',
	pressed: '#4e432e',

	heading: '#faf8f4',
	strong: '#f1ede5',
	text: '#dad3c7',
	subtle: '#b2a999',
	muted: '#8b8374',
	faint: '#615a4d',

	divider: '#ee7fae1a',
	border: '#ee7fae33',
	borderStrong: '#ee7fae59',

	accent: primary,
	accentPress: '#ba8e2e',
	onAccent: onPrimary,
	accentSoft: '#ee7fae26',
	accentText: '#d6bf95',
	// Sits under Discord's white icons, so it is a deeper shade of the primary.
	brand: '#ba8e2e',
	rowIcon: primary,
	selection: '#ee7fae26',

	link: '#d6bf95',
	mentionText: '#ede3d1',
	mentionPill: '#ee7fae33',
	mentionBg: '#ee7fae14',
	replyBg: '#ffffff0d',
	keyword: '#ee7fae40',
	code: '#0d0903',
	codeText: '#d6bf95',
	spoiler: '#433925',
	spoilerRevealed: '#2d2412',

	positive: primary,
	warning: '#ead6b0',
	danger: primary,
	dangerFill: primary,
	scrim: '#0a0307cc',
}

const day: Palette = {
	rail: '#e9e2d6',
	floor: '#fbf9f5',
	panel: '#f1ede5',
	page: '#f1ede5',
	card: '#ffffff',
	popup: '#ffffff',
	input: '#ede8dd',
	control: '#e4dccd',
	pressed: '#d5cbb7',

	heading: '#201706',
	strong: '#2b2009',
	text: '#3d3422',
	subtle: '#625948',
	muted: '#7a705e',
	faint: '#aca495',

	divider: '#2a0c1c14',
	border: '#2a0c1c21',
	borderStrong: '#2a0c1c40',

	accent: primary,
	accentPress: '#ba8e2e',
	onAccent: onPrimary,
	accentSoft: '#ee7fae33',
	// The primary is too light for text on cream, so text and links use a deeper shade.
	accentText: '#856317',
	brand: '#ba8e2e',
	rowIcon: '#ba8e2e',
	selection: '#ee7fae26',

	link: '#6a4e0d',
	mentionText: '#6a4e0d',
	mentionPill: '#ee7fae40',
	mentionBg: '#ee7fae1f',
	replyBg: '#2a0c1c0a',
	keyword: '#ee7fae59',
	code: '#f1ece4',
	codeText: '#6a4e0d',
	spoiler: '#d0c8b9',
	spoilerRevealed: '#e4dccd',

	positive: '#856317',
	warning: '#8d6a1b',
	danger: '#856317',
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
		MOBILE_TEXT_HEADING_PRIMARY: '#856317',
		INTERACTIVE_ICON_ACTIVE: '#856317',
		INTERACTIVE_ICON_HOVER: '#856317',
	},
}

export default plugin({
	preInit({ themes }) {
		themes.registerGroup('champagne', {
			name: 'Champagne',
			description: 'Dark umber with a pale pale-gold accent.',
		})
		themes.registerTheme('champagne', 'champagne', {
			name: 'Champagne',
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
