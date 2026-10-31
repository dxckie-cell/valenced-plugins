import type { JsonStorage } from '@valenced/json-storage'

export interface BadgeDefinition {
	// Key the hidden state is stored under.
	key: string
	// Id the badge has inside Discord's badge lists.
	id: string
	// Name Discord shows for the badge.
	name: string
	// Icon file name on Discord's CDN. Only a fallback: the sharp icon below is used when it can be.
	icon: string
	// Sharp 256px icon hosted in this repository.
	url: string
	// Copy Discord's own details for this badge (title, tagline, rarity, how it is unlocked) when
	// they are seen on another profile, so tapping the badge shows the same sheet.
	copyDetails: boolean
}

export const ID_PREFIX = 'badges-spoof-'

const ICON_BASE = 'https://raw.githubusercontent.com/dxckie-cell/valenced-plugins/main/plugins/badges-spoof/icons'

function define(key: string, name: string, icon: string, copyDetails = false): BadgeDefinition {
	return {
		key,
		id: `${ID_PREFIX}${key}`,
		name,
		icon,
		url: `${ICON_BASE}/${key}.png`,
		copyDetails,
	}
}

// In the order they are shown on the profile.
export const BADGES: BadgeDefinition[] = [
	define('early-supporter', 'Early Supporter', '7060786766c9c840eb3019e725d2b358', true),
	define('hypesquad-events', 'HypeSquad Events', 'bf01d1073931f921909045f3a39fd264'),
	define('moderator-alumni', 'Moderator Programs Alumni', 'fee1624003e2fee35cb398e125dc479b', true),
	define('partnered-server-owner', 'Partnered Server Owner', '3f9748e53446a137a052f3454e2de41e', true),
	define('golden-bug-hunter', 'Discord Bug Hunter', '848f79194d4be5ff5f81505cbd0ce1e6'),
	define('early-verified-bot-developer', 'Early Verified Bot Developer', '6df5892e0f35b051f8b61eace34f4967'),
	define('discord-staff', 'Discord Staff', '5e74e9b61934fc1f67c65515d1f7e60d'),
]

export interface Settings {
	// Badges hidden from the profile. Set by long-pressing a badge in Edit Profile.
	hidden: Record<string, boolean>
	// Show every badge instead of only the first six.
	showAll: boolean
	// Discord's own details for badges, copied from other profiles. Keyed like `hidden`.
	details: Record<string, Record<string, unknown>>
}

export const DEFAULT_SETTINGS: Settings = { hidden: {}, showAll: true, details: {} }

let storage: JsonStorage<Settings> | undefined

export function setStorage(value: JsonStorage<Settings> | undefined) {
	storage = value
}

function read(): Partial<Settings> {
	return (storage?.cache as Partial<Settings> | undefined) ?? {}
}

// Looked up at call time, so changes apply without reloading.
export function isHidden(key: string): boolean {
	const hidden = read().hidden
	return Boolean(hidden && typeof hidden === 'object' && hidden[key] === true)
}

export const showsAll = () => read().showAll !== false

export function getDetails(key: string): Record<string, unknown> | undefined {
	const details = read().details
	const value = details && typeof details === 'object' ? details[key] : undefined
	return value && typeof value === 'object' ? value : undefined
}

export function setDetails(key: string, value: Record<string, unknown>) {
	const details = { ...(read().details ?? {}), [key]: value }
	storage?.set({ details })?.catch?.((e: unknown) => status('details', `could not save: ${(e as Error)?.message}`))
}

export function setHidden(key: string, value: boolean) {
	const hidden = { ...(read().hidden ?? {}), [key]: value }
	storage?.set({ hidden })?.catch?.((e: unknown) => status('settings', `could not save: ${(e as Error)?.message}`))
}

// Lets Discord's hooks re-render when a setting changes.
let version = 0
const listeners = new Set<() => void>()

export const getVersion = () => version

export function subscribe(listener: () => void) {
	listeners.add(listener)
	return () => {
		listeners.delete(listener)
	}
}

export function notifyChange() {
	version++
	for (const listener of listeners) {
		try {
			listener()
		} catch {
			// A failing listener must not stop the others.
		}
	}
}

// What happened on load, shown at the bottom of the settings screen.
// Each line has a key, so a later result replaces an earlier one.
const statusLines = new Map<string, string>()

export function status(key: string, message: string) {
	statusLines.set(key, message)
	console.log(`[badges-spoof] ${message}`)
}

export const getStatusLines = (): string[] => [...statusLines.values()]
export const resetStatus = () => statusLines.clear()
