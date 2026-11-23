/// <reference types="@valenced/themes-api" />

import { lazyColors } from '../../../shared/theme-kit'
import type { Look, Palette, Tone } from '../../../shared/theme-kit'

// Orange from the hair in the references. Every surface and text colour shares its hue.
const primary = '#fc8d53'
const onPrimary = '#2a1205'

// Discord's greys become toasted amber: near-black umber for the dark bases, apricot cream for Light.
const tone: Tone = {
	greys: [
		['#000000', '#0c0502'],
		['#312d2b', '#170b06'],
		['#38322f', '#221108'],
		['#3f3936', '#351f13'],
		['#48423f', '#4b3124'],
		['#605a57', '#684b3d'],
		['#88827f', '#89756b'],
		['#9d9794', '#af9c93'],
		['#b1aba8', '#c2b3ac'],
		['#c8c6c4', '#dbcfca'],
		['#f0eff0', '#f1e8e4'],
		['#f3f3f4', '#f7f1ee'],
		['#fbfbfb', '#fbf7f5'],
		['#ffffff', '#ffffff'],
	],
	// Red and green are the primary too, so errors, badges, voice and online states all match.
	hues: {
		red: primary,
		orange: '#ffaa7e',
		yellow: '#ffccb2',
		green: primary,
		teal: '#f69b6d',
		blue: '#f69b6d',
		blurple: '#f69b6d',
		purple: '#f69b6d',
		pink: '#f69b6d',
	},
}

const night: Palette = {
	rail: '#170b06',
	floor: '#221108',
	panel: '#1b0e08',
	page: '#29160c',
	card: '#351f13',
	popup: '#42291d',
	input: '#1c0f08',
	control: '#4b3124',
	pressed: '#593d2f',

	heading: '#fdf7f4',
	strong: '#f6ebe6',
	text: '#e1d0c8',
	subtle: '#bca59a',
	muted: '#947f75',
	faint: '#6a574d',

	divider: '#ee7fae1a',
	border: '#ee7fae33',
	borderStrong: '#ee7fae59',

	accent: primary,
	accentPress: '#df7439',
	onAccent: onPrimary,
	accentSoft: '#ee7fae26',
	accentText: '#edb498',
	// Sits under Discord's white icons, so it is a deeper shade of the primary.
	brand: '#df7439',
	rowIcon: primary,
	selection: '#ee7fae26',

	link: '#edb498',
	mentionText: '#f7ded2',
	mentionPill: '#ee7fae33',
	mentionBg: '#ee7fae14',
	replyBg: '#ffffff0d',
	keyword: '#ee7fae40',
	code: '#110704',
	codeText: '#edb498',
	spoiler: '#4d3327',
	spoilerRevealed: '#351f13',

	positive: primary,
	warning: '#ffccb2',
	danger: primary,
	dangerFill: primary,
	scrim: '#0a0307cc',
}

const day: Palette = {
	rail: '#f0dfd7',
	floor: '#fef8f5',
	panel: '#f6ebe6',
	page: '#f6ebe6',
	card: '#ffffff',
	popup: '#ffffff',
	input: '#f4e5de',
	control: '#ecd8ce',
	pressed: '#e1c5b8',

	heading: '#281207',
	strong: '#34190b',
	text: '#472f24',
	subtle: '#6b5449',
	muted: '#846b60',
	faint: '#b5a096',

	divider: '#2a0c1c14',
	border: '#2a0c1c21',
	borderStrong: '#2a0c1c40',

	accent: primary,
	accentPress: '#df7439',
	onAccent: onPrimary,
	accentSoft: '#ee7fae33',
	// The primary is too light for text on cream, so text and links use a deeper shade.
	accentText: '#a14f21',
	brand: '#df7439',
	rowIcon: '#df7439',
	selection: '#ee7fae26',

	link: '#813d16',
	mentionText: '#813d16',
	mentionPill: '#ee7fae40',
	mentionBg: '#ee7fae1f',
	replyBg: '#2a0c1c0a',
	keyword: '#ee7fae59',
	code: '#f6eae5',
	codeText: '#813d16',
	spoiler: '#d9c4ba',
	spoilerRevealed: '#ecd8ce',

	positive: '#a14f21',
	warning: '#ab5525',
	danger: '#a14f21',
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
		MOBILE_TEXT_HEADING_PRIMARY: '#a14f21',
		INTERACTIVE_ICON_ACTIVE: '#a14f21',
		INTERACTIVE_ICON_HOVER: '#a14f21',
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
