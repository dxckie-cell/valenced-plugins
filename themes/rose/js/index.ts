/// <reference types="@valenced/themes-api" />

import { lazyColors } from '../../../shared/theme-kit'
import type { Look, Palette, Tone } from '../../../shared/theme-kit'

// Rose pink from the pink hair in the references. Every surface and text colour shares its hue. Dark text on it reaches 7:1.
const primary = '#ee7fae'
const onPrimary = '#2a0716'

// Discord's greys become mulberry rose: near-black plum for the dark bases, blush for Light.
const tone: Tone = {
	greys: [
		['#000000', '#0b040c'],
		['#302c30', '#150917'],
		['#363137', '#1f0f22'],
		['#3e383e', '#311c35'],
		['#474147', '#472d4a'],
		['#5f5960', '#624766'],
		['#868187', '#857287'],
		['#9b969c', '#ab99ad'],
		['#afaab0', '#beb1c0'],
		['#c8c5c8', '#d8ceda'],
		['#f0eff0', '#efe7f0'],
		['#f3f3f4', '#f5f0f6'],
		['#fbfbfb', '#fbf6fb'],
		['#ffffff', '#ffffff'],
	],
	// Red and green are the primary too, so errors, badges, voice and online states all match.
	hues: {
		red: primary,
		orange: '#f29ab8',
		yellow: '#f7c1d4',
		green: primary,
		teal: '#d98ac0',
		blue: '#d078b8',
		blurple: '#c24d84',
		purple: '#c06ab0',
		pink: '#ee7fae',
	},
}

const night: Palette = {
	rail: '#150917',
	floor: '#1f0f22',
	panel: '#190c1b',
	page: '#261329',
	card: '#311c35',
	popup: '#3d2641',
	input: '#1a0d1c',
	control: '#472d4a',
	pressed: '#543958',

	heading: '#fcf6fd',
	strong: '#f4eaf5',
	text: '#decee0',
	subtle: '#b7a2bb',
	muted: '#907c93',
	faint: '#665469',

	divider: '#ee7fae1a',
	border: '#ee7fae33',
	borderStrong: '#ee7fae59',

	accent: primary,
	accentPress: '#c24d84',
	onAccent: onPrimary,
	accentSoft: '#ee7fae26',
	accentText: '#e2acea',
	// Sits under Discord's white icons, so it is a deeper shade of the primary.
	brand: '#c24d84',
	rowIcon: primary,
	selection: '#ee7fae26',

	link: '#e2acea',
	mentionText: '#f2dbf5',
	mentionPill: '#ee7fae33',
	mentionBg: '#ee7fae14',
	replyBg: '#ffffff0d',
	keyword: '#ee7fae40',
	code: '#0f0611',
	codeText: '#e2acea',
	spoiler: '#48304c',
	spoilerRevealed: '#311c35',

	positive: primary,
	warning: '#f7c1d4',
	danger: primary,
	dangerFill: primary,
	scrim: '#0a0307cc',
}

const day: Palette = {
	rail: '#ecddee',
	floor: '#fcf7fd',
	panel: '#f4eaf5',
	page: '#f4eaf5',
	card: '#ffffff',
	popup: '#ffffff',
	input: '#f1e3f2',
	control: '#e8d5eb',
	pressed: '#dbc2de',

	heading: '#240f27',
	strong: '#2f1533',
	text: '#422c46',
	subtle: '#67516a',
	muted: '#7f6882',
	faint: '#b19db4',

	divider: '#2a0c1c14',
	border: '#2a0c1c21',
	borderStrong: '#2a0c1c40',

	accent: primary,
	accentPress: '#c24d84',
	onAccent: onPrimary,
	accentSoft: '#ee7fae33',
	// The primary is too light for text on blush, so text and links use a deeper shade.
	accentText: '#9441a1',
	brand: '#c24d84',
	rowIcon: '#c24d84',
	selection: '#ee7fae26',

	link: '#773083',
	mentionText: '#773083',
	mentionPill: '#ee7fae40',
	mentionBg: '#ee7fae1f',
	replyBg: '#2a0c1c0a',
	keyword: '#ee7fae59',
	code: '#f4e9f5',
	codeText: '#773083',
	spoiler: '#d5c1d8',
	spoilerRevealed: '#e8d5eb',

	positive: '#9441a1',
	warning: '#a8365f',
	danger: '#9441a1',
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
	ICON_STATUS_DND: '#e0386a',
	TEXT_STATUS_DND: '#e0386a',
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
		MOBILE_TEXT_HEADING_PRIMARY: '#9441a1',
		INTERACTIVE_ICON_ACTIVE: '#9441a1',
		INTERACTIVE_ICON_HOVER: '#9441a1',
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
