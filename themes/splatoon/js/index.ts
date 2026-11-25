/// <reference types="@valenced/themes-api" />

import { lazyColors } from '../../../shared/theme-kit'
import type { Look, Palette, Tone } from '../../../shared/theme-kit'

// Port of Merbious' "Splatoon Theme" for Revenge: ink violet, hot pink and lime on near-black.
const primary = '#5f3afc'
const onPrimary = '#ffffff'
const pink = '#fb0f59'
const lime = '#e7fa43'
const onLime = '#171a02'

// Discord's greys become ink black: the dark bases sit on #121212-#181818, Light gets a pale violet tint.
const tone: Tone = {
	greys: [
		['#000000', '#0a0a0a'],
		['#2c2c2c', '#101010'],
		['#323232', '#141414'],
		['#383838', '#181818'],
		['#404040', '#222222'],
		['#585858', '#383838'],
		['#808080', '#767676'],
		['#999999', '#9a9a9a'],
		['#b0b0b0', '#b4b4b4'],
		['#c8c8c8', '#cfcfd6'],
		['#efefef', '#e8e6f5'],
		['#f3f3f4', '#f1effb'],
		['#fbfbfb', '#f8f7fe'],
		['#ffffff', '#ffffff'],
	],
	// Errors are pink, success is lime, everything else leans violet.
	hues: {
		red: pink,
		orange: pink,
		yellow: lime,
		green: lime,
		teal: '#9a85ff',
		blue: '#7d62ff',
		blurple: primary,
		purple: primary,
		pink: pink,
	},
}

const night: Palette = {
	rail: '#0c0c0c',
	floor: '#121212',
	panel: '#141414',
	page: '#181818',
	card: '#1e1e1e',
	popup: '#242424',
	input: '#141414',
	control: '#2a2a2a',
	pressed: '#343434',

	heading: '#ffffff',
	strong: '#f4f4f4',
	text: '#ffffff',
	subtle: '#c4c4c4',
	muted: '#8e8e8e',
	faint: '#5e5e5e',

	divider: '#5f3afc33',
	border: '#5f3afc66',
	borderStrong: '#5f3afc',

	accent: primary,
	accentPress: '#4e2ad8',
	onAccent: onPrimary,
	accentSoft: '#5f3afc33',
	accentText: '#9a85ff',
	brand: primary,
	rowIcon: primary,
	selection: '#5f3afc40',

	link: '#9a85ff',
	mentionText: pink,
	mentionPill: '#fb0f5933',
	mentionBg: '#fb0f5933',
	replyBg: '#5f3afc1a',
	keyword: '#5f3afc40',
	code: '#0e0e0e',
	codeText: lime,
	spoiler: '#2e2e2e',
	spoilerRevealed: '#1e1e1e',

	positive: lime,
	warning: lime,
	danger: pink,
	dangerFill: pink,
	scrim: '#000000cc',
}

const day: Palette = {
	rail: '#e4dffa',
	floor: '#faf9ff',
	panel: '#f1effb',
	page: '#f1effb',
	card: '#ffffff',
	popup: '#ffffff',
	input: '#e9e5f9',
	control: '#e0daf7',
	pressed: '#cfc7f0',

	heading: '#14102b',
	strong: '#1c1640',
	text: '#2d2656',
	subtle: '#51497d',
	muted: '#6a6394',
	faint: '#a39fc4',

	divider: '#5f3afc1f',
	border: '#5f3afc33',
	borderStrong: '#5f3afc66',

	accent: primary,
	accentPress: '#4e2ad8',
	onAccent: onPrimary,
	accentSoft: '#5f3afc26',
	accentText: '#4a26d9',
	brand: primary,
	rowIcon: primary,
	selection: '#5f3afc26',

	link: '#4a26d9',
	mentionText: '#c4073f',
	mentionPill: '#fb0f5926',
	mentionBg: '#fb0f591a',
	replyBg: '#5f3afc0f',
	keyword: '#5f3afc33',
	code: '#eeebfb',
	codeText: '#4a26d9',
	spoiler: '#cbc4ea',
	spoilerRevealed: '#e0daf7',

	positive: '#6b7d00',
	warning: '#6b7d00',
	danger: '#c4073f',
	dangerFill: pink,
	scrim: '#14102b59',
}

// Online and voice are lime, do-not-disturb and alerts are pink, offline and streaming are violet.
const states = {
	STATUS_POSITIVE: lime,
	STATUS_ONLINE: lime,
	STATUS_SPEAKING: lime,
	STATUS_DANGER: pink,
	STATUS_POSITIVE_BACKGROUND: lime,
	STATUS_POSITIVE_TEXT: onLime,
	ICON_STATUS_ONLINE: lime,
	TEXT_STATUS_ONLINE: lime,
	ICON_STATUS_DND: pink,
	TEXT_STATUS_DND: pink,
	ICON_VOICE_CONNECTED: lime,
	ICON_VOICE_SPEAKING: lime,
	ICON_VOICE_MUTED: pink,
	ICON_VOICE_DISCONNECTED: pink,
	ICON_FEEDBACK_NOTIFICATION: pink,
	BADGE_SUCCESS_BACKGROUND: lime,
	BADGE_SUCCESS_TEXT: onLime,
	BADGE_NOTIFICATION_BACKGROUND: pink,
	BADGE_NOTIFICATION_TEXT: '#ffffff',
	BADGE_CRITICAL_BACKGROUND: pink,
	BADGE_CRITICAL_TEXT: '#ffffff',
	CONTROL_CRITICAL_PRIMARY_TEXT_DEFAULT: '#ffffff',
	// The original recolours icons and channel glyphs: violet normally, pink on hover, lime for channels.
	CHANNEL_ICON: lime,
	INTERACTIVE_NORMAL: primary,
	INTERACTIVE_MUTED: '#5f3afc60',
	INPUT_BORDER: primary,
	INPUT_BORDER_FOCUS: pink,
	SCROLLBAR_THIN_THUMB: pink,
	FOCUS_PRIMARY: primary,
	FOCUS_SECONDARY: pink,
}

// Header names and the server-list dots follow the violet, hover goes pink as in the original.
const dark: Look = {
	palette: night,
	extra: {
		...states,
		MOBILE_TEXT_HEADING_PRIMARY: '#7d62ff',
		INTERACTIVE_NORMAL: '#7d62ff',
		INTERACTIVE_ICON_ACTIVE: '#7d62ff',
		INTERACTIVE_ICON_HOVER: pink,
	},
}
const light: Look = {
	palette: day,
	extra: {
		...states,
		CHANNEL_ICON: '#6b7d00',
		MOBILE_TEXT_HEADING_PRIMARY: '#4a26d9',
		INTERACTIVE_ICON_ACTIVE: '#4a26d9',
		INTERACTIVE_ICON_HOVER: '#c4073f',
	},
}

export default plugin({
	preInit({ themes }) {
		themes.registerGroup('splatoon', {
			name: 'Splatoon',
			description: 'Ink black with violet, hot pink and lime.',
		})
		themes.registerTheme('splatoon', 'splatoon', {
			name: 'Splatoon',
			description: 'Ink-black surfaces with Splatoon violet, hot pink and lime, or a pale violet day on Light.',
			// Same image, opacity and blur as the original.
			background: {
				path: 'https://raw.githubusercontent.com/n0t-a-username/revenge-themes/refs/heads/main/Images/splatoon.jpg',
				opacity: 0.5,
				blur: 0.75,
			},
			getColors: lazyColors(tone, {
				dark,
				darker: dark,
				midnight: dark,
				light,
			}),
		})
	},
})
