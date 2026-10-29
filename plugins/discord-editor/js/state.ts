import type { JsonStorage } from '@valenced/json-storage'

// The account this plugin edits.
export const TARGET_ID = '643945264868098049'

// Placeholder banner hash, only used so the profile screen draws a banner area
// for an account that has none. The real image comes from the setting.
export const PLACEHOLDER_HASH = 'discord-editor-banner'

export interface Settings {
	name: string
	avatar: string
	banner: string
	nameColor: string
	badgeText: string
	badgeBgColor: string
	badgeTextColor: string
	verified: boolean
}

// Empty means "leave Discord's default"; the shown defaults are only for the preview.
export const DEFAULT_SETTINGS: Settings = {
	name: '',
	avatar: '',
	banner: '',
	nameColor: '',
	badgeText: '',
	badgeBgColor: '',
	badgeTextColor: '',
	verified: false,
}

export const PREVIEW_DEFAULTS = {
	name: 'Discord',
	nameColor: '#ED4245',
	badgeText: 'APP',
	badgeBgColor: '#ED4245',
	badgeTextColor: '#FFFFFF',
}

export const HEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/

let storage: JsonStorage<Settings> | undefined

export function setStorage(value: JsonStorage<Settings> | undefined) {
	storage = value
}

// Looked up at call time, so edits in settings apply without reloading.
function read(key: Exclude<keyof Settings, 'verified'>): string | undefined {
	const value = (storage?.cache as Partial<Settings> | undefined)?.[key]
	return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export const getName = () => read('name')
export const getAvatar = () => read('avatar')

// The banner for this account only; undefined for everyone else.
export function getBanner(userId?: string): string | undefined {
	return userId === TARGET_ID ? read('banner') : undefined
}

const readColor = (key: 'nameColor' | 'badgeBgColor' | 'badgeTextColor') => {
	const value = read(key)
	return value && HEX.test(value) ? value : undefined
}

export const getNameColor = () => readColor('nameColor')
export const getBadgeBgColor = () => readColor('badgeBgColor')
export const getBadgeTextColor = () => readColor('badgeTextColor')
export const getBadgeText = () => read('badgeText')
export const getVerified = () =>
	(storage?.cache as Partial<Settings> | undefined)?.verified === true
