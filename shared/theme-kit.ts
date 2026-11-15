/**
 * Shared colour engine for the theme plugins. Each theme bundles its own copy.
 *
 * Themes are built in two layers:
 * 1. {@link toneMapper} maps Discord's whole raw palette onto the theme, so every key, including ones no
 *    theme names, follows it. Greys follow the theme's tone scale and each hue family follows the
 *    theme's colour for it, keeping Discord's lighter and darker steps around it.
 * 2. {@link paint} sets the main semantic keys exactly, from a {@link Palette}.
 */

import { AshColors, LightColors } from './discord-defaults'
import type { ThemeColors } from '@valenced/themes-api/types'

export interface Palette {
	// Surfaces, back to front.
	/** Server rail and the darkest frame. */
	rail: string
	/** Chat, and under the chat box. */
	floor: string
	/** DM list and channel list. */
	panel: string
	/** Settings and other pages that open on top. */
	page: string
	/** Grouped rows, embeds and cards. */
	card: string
	/** Popup menus, sheets and alerts. */
	popup: string
	/** Chat box and text fields. */
	input: string
	/** Secondary buttons. */
	control: string
	/** Pressed rows and buttons. */
	pressed: string
	// Text, strongest to faintest.
	heading: string
	strong: string
	text: string
	subtle: string
	muted: string
	faint: string
	// Lines.
	divider: string
	border: string
	borderStrong: string
	// Accent. `brand` sits under Discord's white icons, `accent` under `onAccent`.
	accent: string
	accentPress: string
	onAccent: string
	accentSoft: string
	accentText: string
	brand: string
	rowIcon: string
	/** Selected channels, tabs and toggles. */
	selection: string
	// Messages.
	link: string
	mentionText: string
	/** The @name pill. */
	mentionPill: string
	/** Messages that mention you. */
	mentionBg: string
	/** Jumped-to and replied-to messages. */
	replyBg: string
	keyword: string
	code: string
	codeText: string
	spoiler: string
	spoilerRevealed: string
	// Feedback.
	positive: string
	warning: string
	danger: string
	dangerFill: string
	scrim: string
}

/** Discord's hue families, each named after its usual swatch. */
export interface Hues {
	red: string
	orange: string
	yellow: string
	green: string
	teal: string
	blue: string
	blurple: string
	purple: string
	pink: string
}

export interface Tone {
	/**
	 * Grey scale as `[Discord grey, theme colour]` stops, darkest first. Greys between stops blend.
	 * Ash greys for reference: rail `#2c2d32`, chat `#323339`, cards `#393a41`, menus `#3f4048`,
	 * thread lines `#595a63`, muted text `#abacb2`, subtle text `#c5c6ca`, text `#f3f3f4`.
	 */
	greys: [string, string][]
	/** What each Discord swatch becomes. Lighter and darker steps keep their offset from it. */
	hues: Hues
}

/** Discord's swatch for each family, which {@link Hues} values replace. */
const DiscordHues: Hues = {
	red: '#d22d39',
	orange: '#fe6e0d',
	yellow: '#faaa00',
	green: '#23a55a',
	teal: '#4cb5bf',
	blue: '#0074e3',
	blurple: '#5865f2',
	purple: '#a056f2',
	pink: '#ff4cd2',
}

/** Chroma under which a colour counts as grey. */
const GreyChroma = 0.035

type Lab = [number, number, number]

function parse(hex: string) {
	const rgb: Lab = [0, 0, 0]
	for (let i = 0; i < 3; i++)
		rgb[i] = Number.parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255
	return rgb
}

const toLinear = (c: number) =>
	c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
const toGamma = (c: number) =>
	c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055

/** sRGB hex to OKLab. */
function lab(hex: string): Lab {
	const [r, g, b] = parse(hex).map(toLinear) as Lab
	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
	const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
	return [
		0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
		1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
		0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
	]
}

function linearRgb([L, a, b]: Lab): Lab {
	const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
	const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
	const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
	return [
		4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
		-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
		-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
	]
}

const inGamut = (rgb: Lab) => rgb.every(c => c >= -1e-4 && c <= 1 + 1e-4)

/** OKLab to sRGB hex, lowering chroma until the colour fits. */
function hex([L, a, b]: Lab) {
	let rgb = linearRgb([L, a, b])
	if (!inGamut(rgb)) {
		let lo = 0
		let hi = 1
		for (let i = 0; i < 12; i++) {
			const mid = (lo + hi) / 2
			if (inGamut(linearRgb([L, a * mid, b * mid]))) lo = mid
			else hi = mid
		}
		rgb = linearRgb([L, a * lo, b * lo])
	}
	let out = '#'
	for (const c of rgb)
		out += Math.round(Math.min(1, Math.max(0, toGamma(c))) * 255)
			.toString(16)
			.padStart(2, '0')
	return out
}

const chroma = ([, a, b]: Lab) => Math.hypot(a, b)
const hue = ([, a, b]: Lab) => Math.atan2(b, a)

function hueDistance(x: number, y: number) {
	const d = Math.abs(x - y) % (2 * Math.PI)
	return d > Math.PI ? 2 * Math.PI - d : d
}

/** Blends two `#RRGGBB` colours in OKLab, `t` of the way from `a` to `b`. */
export function mix(a: string, b: string, t: number) {
	const x = lab(a)
	const y = lab(b)
	return hex([0, 1, 2].map(i => x[i]! + (y[i]! - x[i]!) * t) as Lab)
}

/** A `#RRGGBBAA` colour laid over an opaque `#RRGGBB`, flattened to one opaque colour. */
export function over(top: string, bottom: string) {
	if (top.length !== 9) return top
	const alpha = Number.parseInt(top.slice(7), 16) / 255
	const a = parse(top)
	const b = parse(bottom)
	let out = '#'
	for (let i = 0; i < 3; i++)
		out += Math.round((a[i]! * alpha + b[i]! * (1 - alpha)) * 255)
			.toString(16)
			.padStart(2, '0')
	return out
}

/** Builds a raw palette mapper for a {@link Tone}. Results are cached per Discord colour. */
export function toneMapper(tone: Tone) {
	const greys = tone.greys.map(([from, to]) => [lab(from)[0], lab(to)] as const)
	const families = (Object.keys(DiscordHues) as (keyof Hues)[]).map(name => {
		const from = lab(DiscordHues[name])
		const to = lab(tone.hues[name])
		return {
			hue: hue(from),
			from,
			to,
			toChroma: chroma(to),
			toHue: hue(to),
		}
	})
	const cache = new Map<string, string>()

	function grey(L: number): Lab {
		const first = greys[0]!
		const last = greys[greys.length - 1]!
		if (L <= first[0]) return first[1]
		if (L >= last[0]) return last[1]
		let i = 1
		while (greys[i]![0] < L) i++
		const [l0, c0] = greys[i - 1]!
		const [l1, c1] = greys[i]!
		const t = (L - l0) / (l1 - l0 || 1)
		return [0, 1, 2].map(k => c0[k]! + (c1[k]! - c0[k]!) * t) as Lab
	}

	function colour(c: Lab): Lab {
		const h = hue(c)
		let family = families[0]!
		for (const f of families)
			if (hueDistance(h, f.hue) < hueDistance(h, family.hue)) family = f
		const L = Math.min(
			0.99,
			Math.max(0.02, family.to[0] + c[0] - family.from[0]),
		)
		const C = family.toChroma * Math.min(1.25, chroma(c) / chroma(family.from))
		return [L, C * Math.cos(family.toHue), C * Math.sin(family.toHue)]
	}

	return (value: string) => {
		if (!/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value)) return value
		const base = value.slice(0, 7).toLowerCase()
		let mapped = cache.get(base)
		if (!mapped) {
			const c = lab(base)
			mapped = hex(chroma(c) < GreyChroma ? grey(c[0]) : colour(c))
			cache.set(base, mapped)
		}
		return mapped + value.slice(7)
	}
}

/** Sets the alpha of a `#RRGGBB` or `#RRGGBBAA` colour. */
const alpha = (color: string, value: string) => color.slice(0, 7) + value

/** Makes a `#RRGGBB` colour opaque. Theme backgrounds make six-digit colours inherit Discord's gradient, fading action sheets and emoji buttons. */
const solid = (color: string) => (color.length === 7 ? `${color}ff` : color)

/** Semantic colours from a {@link Palette}. */
export function paint(p: Palette): Record<string, string> {
	return {
		// Backgrounds.
		BACKGROUND_BASE_LOWEST: p.rail,
		BACKGROUND_BASE_LOWER: p.floor,
		BACKGROUND_BASE_LOW: p.panel,
		BACKGROUND_SURFACE_HIGH: p.card,
		BACKGROUND_SURFACE_HIGHEST: p.popup,
		BACKGROUND_SECONDARY_ALT: p.panel,
		BACKGROUND_ACCENT: p.control,
		BG_SURFACE_RAISED: p.card,
		BACKGROUND_BRAND: p.brand,
		BACKGROUND_SCRIM: p.scrim,
		CONTEXT_MENU_BACKDROP_BACKGROUND: p.scrim,
		CHANNEL_BACKGROUND_DEFAULT: p.floor,
		PANEL_BG: p.panel,
		STANDALONE_CHANNEL_CONTENT_BACKGROUND: p.floor,
		MOBILE_KEYBOARD_GAP_BACKGROUND: p.floor,
		MOBILE_SEARCHBAR_GRADIENT_BACKGROUND: p.floor,
		MOBILE_TYPING_INDICATOR_BACKGROUND_DEFAULT: p.floor,
		MOBILE_FLOATINGBAR_BACKGROUND_SCRIM: p.floor,
		ANDROID_NAVIGATION_BAR_BACKGROUND: p.rail,
		USER_PROFILE_GRADIENT_BACKGROUND: p.rail,
		GUILD_PROFILE_BANNER_BACKGROUND_DEFAULT: p.rail,
		MOBILE_VOICE_PANEL_BACKGROUND: p.rail,
		MOBILE_ACTIONSHEET_BACKGROUND: p.page,
		MOBILE_ACTIONSHEET_GRADIENT_BACKGROUND_DEFAULT: p.page,
		MOBILE_EXPRESSION_PICKER_BACKGROUND_DEFAULT: p.page,
		MOBILE_KEYBOARD_PANEL_BACKGROUND: p.page,
		MOBILE_COMMAND_BAR_BACKGROUND: p.page,
		MODAL_BACKGROUND: p.page,
		MODAL_FOOTER_BACKGROUND: p.page,
		TAB_BAR_BACKGROUND: p.page,
		BLUR_FALLBACK: alpha(p.page, 'f5'),
		BLUR_FALLBACK_PRESSED: alpha(p.pressed, 'f5'),
		THEME_LOCKED_BLUR_FALLBACK: alpha(p.page, 'f5'),
		LEGACY_BLUR_FALLBACK_DEFAULT: alpha(p.popup, 'f9'),
		LEGACY_ANDROID_BLUR_OVERLAY_DEFAULT: alpha(p.popup, '80'),
		MOBILE_ALERT_BACKGROUND_DEFAULT: p.popup,
		MOBILE_COACHMARK_BACKGROUND_DEFAULT: p.popup,
		MOBILE_TOAST_BACKGROUND_DEFAULT: p.popup,
		MOBILE_FLOATINGBAR_BACKGROUND: p.popup,
		MOBILE_FLOATINGBAR_BACKGROUND_HIGHER: p.popup,
		MOBILE_FLOATINGBAR_BACKGROUND_NAMEPLATE: p.card,
		MOBILE_FLOATING_ACCESSORY_BACKGROUND: p.popup,
		CUSTOM_STATUS_BUBBLE_BG: p.popup,
		CARD_BACKGROUND_DEFAULT: solid(p.card),
		CARD_MUTED_BG: solid(p.card),
		CARD_SECONDARY_BG: solid(p.card),
		CARD_SECONDARY_BACKGROUND_DEFAULT: solid(p.card),
		CARD_MUTED_PRESSED_BG: solid(p.pressed),
		CARD_PRIMARY_PRESSED_BG: solid(p.pressed),
		CARD_SECONDARY_PRESSED_BG: solid(p.pressed),
		CARD_SECONDARY_BACKGROUND_ACTIVE: solid(p.pressed),
		TABLEROW_BACKGROUND_DEFAULT: solid(p.card),
		TABLEROW_BACKGROUND_PRESSED: solid(p.pressed),
		BACKGROUND_APP_LAUNCHER_CARD_DEFAULT: solid(p.card),
		BACKGROUND_APP_LAUNCHER_ROW_DEFAULT: solid(p.card),
		CHAT_BANNER_BG: p.card,
		EMBED_BACKGROUND: p.card,
		EMBED_BACKGROUND_ALTERNATE: p.card,
		MOBILE_EMBED_BACKGROUND_DEFAULT: p.card,
		MOBILE_THREAD_EMBED_BACKGROUND: p.card,
		MOBILE_COMMAND_CATEGORIES_BACKGROUND: p.card,
		MOBILE_GUILDBAR_ICON_BACKGROUND_DEFAULT: p.card,
		MOBILE_EMOJI_BUTTON_BACKGROUND: solid(p.control),
		MOBILE_SEGMENTED_CONTROL_BACKGROUND: p.card,
		MOBILE_SEGMENTED_CONTROL_INDICATOR_BACKGROUND: p.control,
		MOBILE_VOICE_MESSAGE_RECORDING_LOCK_BACKGROUND_DEFAULT: p.card,
		POLLS_NORMAL_IMAGE_BACKGROUND: p.card,
		GUILD_NOTIFICATIONS_BOTTOM_SHEET_PILL_BACKGROUND: p.rail,
		VOICE_CHANNEL_USER_LIMIT_BACKGROUND: p.card,
		GUILD_FOLDER_BACKGROUND: p.selection,
		INTERACTIVE_BACKGROUND_ACTIVE: p.selection,
		INTERACTIVE_BACKGROUND_SELECTED: p.selection,
		MOBILE_CHANNEL_ITEM_BACKGROUND_SELECTED: p.selection,
		REDESIGN_INPUT_CONTROL_ACTIVE_BG: p.pressed,

		// Text.
		MOBILE_TEXT_HEADING_PRIMARY: p.heading,
		USER_PROFILE_ABOUT_ME_HEADING_TEXT: p.heading,
		TEXT_STRONG: p.strong,
		TEXT_DEFAULT: p.text,
		TEXT_SUBTLE: p.subtle,
		TEXT_MUTED: p.muted,
		TEXT_LINK: p.link,
		TEXT_BRAND: p.accentText,
		TEXT_CODE: p.codeText,
		TEXT_FEEDBACK_POSITIVE: p.positive,
		TEXT_FEEDBACK_WARNING: p.warning,
		TEXT_FEEDBACK_CRITICAL: p.danger,
		INPUT_TEXT_DEFAULT: p.strong,
		INPUT_PLACEHOLDER_TEXT_DEFAULT: p.muted,
		INTERACTIVE_TEXT_DEFAULT: p.subtle,
		INTERACTIVE_TEXT_HOVER: p.strong,
		INTERACTIVE_TEXT_ACTIVE: p.strong,
		MESSAGES_ITEM_CHANNEL_TEXT_DEFAULT: p.subtle,
		REDESIGN_CHANNEL_NAME_TEXT: p.strong,
		REDESIGN_CHANNEL_NAME_MUTED_TEXT: p.muted,
		CHANNELS_DEFAULT: p.muted,
		TAB_LABEL_TEXT_DEFAULT: p.subtle,
		TAB_LABEL_TEXT_FOCUSED: p.strong,
		MOBILE_UNREADBAR_TEXT_DEFAULT: p.subtle,
		REDESIGN_BUTTON_TERTIARY_TEXT: p.text,
		REDESIGN_BUTTON_TERTIARY_PRESSED_TEXT: p.subtle,
		CONTROL_BRAND_FOREGROUND: p.accentText,
		CONTROL_BRAND_FOREGROUND_NEW: p.accentText,

		// Icons.
		ICON_STRONG: p.strong,
		ICON_DEFAULT: p.text,
		ICON_SUBTLE: p.subtle,
		ICON_MUTED: p.muted,
		ICON_BRAND: p.accentText,
		ICON_FEEDBACK_POSITIVE: p.positive,
		ICON_FEEDBACK_WARNING: p.warning,
		ICON_FEEDBACK_CRITICAL: p.danger,
		CHANNEL_ICON: p.faint,
		INTERACTIVE_ICON_DEFAULT: p.subtle,
		INTERACTIVE_ICON_HOVER: p.strong,
		INTERACTIVE_ICON_ACTIVE: p.strong,
		TABLEROW_ICON_COLOR_DEFAULT: p.rowIcon,
		MOBILE_GUILDBAR_ICON_DEFAULT: p.subtle,
		MOBILE_HEADER_ICON_DEFAULT: p.strong,
		NAVIGATOR_HEADER_TINT: p.strong,
		CHAT_INPUT_ICON_DEFAULT_TINT: p.subtle,
		CHAT_INPUT_ACTION_BUTTON_ICON_DEFAULT_TINT: p.subtle,
		CHAT_INPUT_ACTION_ICON_ACTIVE_TINT: p.strong,
		CONTROL_ICON_ONLY_ICON_DEFAULT: p.subtle,
		CONTROL_ICON_ONLY_ICON_ACTIVE: p.strong,
		INPUT_ICON_DEFAULT: p.subtle,

		// Borders.
		APP_FRAME_BORDER: p.border,
		BORDER_SUBTLE: p.divider,
		BORDER_MUTED: p.border,
		BORDER_NORMAL: p.border,
		BORDER_STRONG: p.borderStrong,
		CARD_BORDER_DEFAULT: p.border,
		CHAT_BORDER: p.divider,
		MOBILE_HEADER_BORDER: p.border,
		MOBILE_COACHMARK_BORDER_DEFAULT: p.border,
		MOBILE_FLOATING_ACCESSORY_BORDER: p.border,
		MOBILE_COMMAND_BAR_DIVIDER: p.divider,
		STANDALONE_CHANNEL_HEADER_BORDER: p.divider,
		// Thread pipes are drawn in overlapping pieces, so a translucent colour doubles up at each joint.
		SPINE_DEFAULT: over(p.borderStrong, p.panel),
		THREAD_CHANNEL_SPINE: over(p.borderStrong, p.panel),
		SLIDER_TRACK_BACKGROUND: p.borderStrong,

		// Chat box and inputs.
		MOBILE_CHATINPUT_BACKGROUND_DEFAULT: p.input,
		MOBILE_CHATINPUT_BACKGROUND_ACTIVE: p.input,
		MOBILE_CHATINPUT_BORDER_DEFAULT: p.border,
		MOBILE_CHATINPUT_BORDER_ACTIVE: p.borderStrong,
		REDESIGN_CHAT_INPUT_BACKGROUND: p.input,
		CHANNELTEXTAREA_BACKGROUND: p.input,
		CHAT_INPUT_BACKGROUND: p.input,
		SHARE_CHAT_INPUT_BACKGROUND: p.input,
		CHAT_INPUT_SEND_BUTTON_ACTIVE_BACKGROUND: p.accent,
		CHAT_INPUT_SEND_BUTTON_ICON_ACTIVE_TINT: p.onAccent,
		INPUT_BACKGROUND_DEFAULT: p.input,
		INPUT_BORDER_DEFAULT: p.border,
		INPUT_BORDER_ACTIVE: p.accent,
		BORDER_FOCUS: p.accent,

		// Buttons.
		CONTROL_PRIMARY_BACKGROUND_DEFAULT: p.accent,
		CONTROL_PRIMARY_BACKGROUND_ACTIVE: p.accentPress,
		CONTROL_PRIMARY_TEXT_DEFAULT: p.onAccent,
		CONTROL_SECONDARY_BACKGROUND_DEFAULT: p.control,
		CONTROL_SECONDARY_BACKGROUND_ACTIVE: p.pressed,
		CONTROL_SECONDARY_BORDER_DEFAULT: p.border,
		CONTROL_SECONDARY_BORDER_ACTIVE: p.borderStrong,
		CONTROL_SECONDARY_TEXT_DEFAULT: p.strong,
		CONTROL_CRITICAL_SECONDARY_TEXT_DEFAULT: p.danger,
		CONTROL_CRITICAL_PRIMARY_BACKGROUND_DEFAULT: p.dangerFill,
		INTERACTIVE_ACCENT_BACKGROUND_SELECTED: p.accent,
		INTERACTIVE_ACCENT_BACKGROUND_ACTIVE: p.accentPress,
		TOGGLEBUTTON_BORDER_SELECTED: p.accent,
		TOGGLEBUTTON_BACKGROUND_SELECTED: p.accentSoft,

		// Switches, checkboxes and radios.
		SWITCH_BACKGROUND_DEFAULT: p.control,
		SWITCH_BORDER_DEFAULT: p.border,
		SWITCH_BACKGROUND_SELECTED_DEFAULT: p.accent,
		SWITCH_BORDER_SELECTED_DEFAULT: p.accent,
		SWITCH_THUMB_BACKGROUND_DEFAULT: p.subtle,
		SWITCH_THUMB_BACKGROUND_SELECTED_DEFAULT: p.onAccent,
		SWITCH_THUMB_ICON_DEFAULT: p.control,
		SWITCH_THUMB_ICON_ACTIVE: p.accent,
		CHECKBOX_BORDER_DEFAULT: p.muted,
		CHECKBOX_BORDER_SELECTED_DEFAULT: p.accent,
		CHECKBOX_BACKGROUND_SELECTED_DEFAULT: p.accent,
		CHECKBOX_ICON_ACTIVE: p.onAccent,
		RADIO_BORDER_DEFAULT: p.muted,
		REDESIGN_INPUT_CONTROL_SELECTED: p.accent,
		PROGRESSBAR_INDICATOR_BACKGROUND: p.accent,
		ACTIVITY_TIMEBAR_PROGRESS_BACKGROUND: p.accent,

		// Messages.
		MENTION_FOREGROUND: p.mentionText,
		MENTION_BACKGROUND: p.mentionPill,
		MESSAGE_MENTIONED_BACKGROUND_DEFAULT: p.mentionBg,
		MESSAGE_MENTIONED_BACKGROUND_HOVER: p.mentionBg,
		MESSAGE_HIGHLIGHT_BACKGROUND_DEFAULT: p.replyBg,
		MESSAGE_HIGHLIGHT_BACKGROUND_HOVER: p.replyBg,
		KEYWORD_HIGHLIGHT_BACKGROUND: p.keyword,
		BACKGROUND_CODE: p.code,
		SPOILER_HIDDEN_BACKGROUND: p.spoiler,
		SPOILER_REVEALED_BACKGROUND: p.spoilerRevealed,
		REACTION_BACKGROUND_DEFAULT: p.card,
		REACTION_BORDER_DEFAULT: p.border,
		REACTION_TEXT_DEFAULT: p.subtle,
		REACTION_BACKGROUND_REACTED_DEFAULT: p.accentSoft,
		REACTION_BORDER_REACTED_DEFAULT: p.accent,
		REACTION_TEXT_REACTED_DEFAULT: p.accentText,
		POLLS_VOTED_FILL: p.accentSoft,
		MOBILE_CHAT_NEW_MESSAGE_TEXT: p.danger,
		MOBILE_CHAT_NEW_MESSAGE_BORDER: p.danger,

		// Status.
		STATUS_POSITIVE: p.positive,
		STATUS_WARNING: p.warning,
		STATUS_DANGER: p.danger,
		BACKGROUND_FEEDBACK_NOTIFICATION: p.dangerFill,
	}
}

export interface Look {
	palette: Palette
	/** Theme-specific semantic colours, applied last. */
	extra?: Record<string, string>
	/** Tone for this base's semantic colours, when it differs from the theme's main tone. */
	tone?: Tone
}

type Base = 'dark' | 'darker' | 'light' | 'midnight'

/**
 * Theme colours for the given bases. Every semantic key is mapped from Discord's Ash colours (Light's
 * for `light`), so Ash, Dark and Onyx look the same. {@link paint} and `extra` go on top, and the raw
 * palette is recoloured for anything that reads it directly.
 */
export function themeColors(
	discord: { raw: Record<string, string> },
	tone: Tone,
	looks: Partial<Record<Base, Look>>,
): ThemeColors {
	const map = toneMapper(tone)
	const semantic: NonNullable<ThemeColors['semantic']> = {}
	for (const [base, look] of Object.entries(looks) as [Base, Look][]) {
		const colors: Record<string, string> = {}
		const defaults = base === 'light' ? LightColors : AshColors
		const mapLook = look.tone ? toneMapper(look.tone) : map
		for (const name in defaults) colors[name] = mapLook(defaults[name]!)
		semantic[base] = Object.assign(colors, paint(look.palette), look.extra)
	}
	const raw: Record<string, string> = {}
	for (const name in discord.raw) raw[name] = map(discord.raw[name]!)
	return { raw, semantic }
}

/** A theme's `getColors`, computing {@link themeColors} once and reusing it for later calls. */
export function lazyColors(tone: Tone, looks: Partial<Record<Base, Look>>) {
	let colors: ThemeColors | undefined
	return (discord: { raw: Record<string, string> }) =>
		(colors ??= themeColors(discord, tone, looks))
}
