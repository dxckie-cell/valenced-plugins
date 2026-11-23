/// <reference types="@valenced/themes-api" />

import { lazyColors } from '../../../shared/theme-kit'
import type { Look, Palette, Tone } from '../../../shared/theme-kit'

// Fresh green from the hair in the references. Every surface and text colour shares its hue.
const primary = '#6fc46e'
const onPrimary = '#001101'

// Discord's greys become deep forest: near-black green for the dark bases, mint-white for Light.
const tone: Tone = {
	greys: [
		['#000000', '#020902'],
		['#2b2f2b', '#051105'],
		['#2f352e', '#061b06'],
		['#363c35', '#122d12'],
		['#3f453e', '#234123'],
		['#575d56', '#3c5b3b'],
		['#7f857e', '#6b816a'],
		['#949a93', '#93a692'],
		['#a8aea7', '#acbbab'],
		['#c4c7c4', '#cad6ca'],
		['#f0eff0', '#e4ede4'],
		['#f3f3f4', '#eef4ed'],
		['#fbfbfb', '#f6faf6'],
		['#ffffff', '#ffffff'],
	],
	// Red and green are the primary too, so errors, badges, voice and online states all match.
	hues: {
		red: primary,
		orange: '#6fc46e',
		yellow: '#b7e0b5',
		green: primary,
		teal: '#8dc58b',
		blue: '#8dc58b',
		blurple: '#8dc58b',
		purple: '#8dc58b',
		pink: '#8dc58b',
	},
}

const night: Palette = {
	rail: '#051105',
	floor: '#061b06',
	panel: '#071607',
	page: '#0b210b',
	card: '#122d12',
	popup: '#1b381b',
	input: '#081708',
	control: '#234123',
	pressed: '#2f4e2e',

	heading: '#f4faf3',
	strong: '#e7f1e6',
	text: '#c8dac7',
	subtle: '#9ab299',
	muted: '#758b74',
	faint: '#4e614d',

	divider: '#ee7fae1a',
	border: '#ee7fae33',
	borderStrong: '#ee7fae59',

	accent: primary,
	accentPress: '#6fa66e',
	onAccent: onPrimary,
	accentSoft: '#ee7fae26',
	accentText: '#9bd398',
	// Sits under Discord's white icons, so it is a deeper shade of the primary.
	brand: '#6fa66e',
	rowIcon: primary,
	selection: '#ee7fae26',

	link: '#9bd398',
	mentionText: '#d3ebd1',
	mentionPill: '#ee7fae33',
	mentionBg: '#ee7fae14',
	replyBg: '#ffffff0d',
	keyword: '#ee7fae40',
	code: '#030d03',
	codeText: '#9bd398',
	spoiler: '#254325',
	spoilerRevealed: '#122d12',

	positive: primary,
	warning: '#b7e0b5',
	danger: primary,
	dangerFill: primary,
	scrim: '#0a0307cc',
}

const day: Palette = {
	rail: '#d7e9d6',
	floor: '#f5faf4',
	panel: '#e7f1e6',
	page: '#e7f1e6',
	card: '#ffffff',
	popup: '#ffffff',
	input: '#deeddd',
	control: '#cfe4ce',
	pressed: '#b9d5b7',

	heading: '#051e06',
	strong: '#072908',
	text: '#233d23',
	subtle: '#496148',
	muted: '#5f795e',
	faint: '#96ac95',

	divider: '#2a0c1c14',
	border: '#2a0c1c21',
	borderStrong: '#2a0c1c40',

	accent: primary,
	accentPress: '#6fa66e',
	onAccent: onPrimary,
	accentSoft: '#ee7fae33',
	// The primary is too light for text on cream, so text and links use a deeper shade.
	accentText: '#437842',
	brand: '#6fa66e',
	rowIcon: '#6fa66e',
	selection: '#ee7fae26',

	link: '#2c612c',
	mentionText: '#2c612c',
	mentionPill: '#ee7fae40',
	mentionBg: '#ee7fae1f',
	replyBg: '#2a0c1c0a',
	keyword: '#ee7fae59',
	code: '#e5f1e5',
	codeText: '#2c612c',
	spoiler: '#bad0b9',
	spoilerRevealed: '#cfe4ce',

	positive: '#437842',
	warning: '#4a7f49',
	danger: '#437842',
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
		MOBILE_TEXT_HEADING_PRIMARY: '#437842',
		INTERACTIVE_ICON_ACTIVE: '#437842',
		INTERACTIVE_ICON_HOVER: '#437842',
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
