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
	// Icon for the badge's sheet; the same as `url` unless it was resized to match Discord's.
	sheetUrl: string
	// What Discord's sheet says for this badge on someone else's profile, in place of "Unlocked".
	// Badges with one are legacy badges and get the "Legacy Badge" line; Discord Staff has none.
	phrase?: string
	// A tiered badge (Gifting, Server Boosting): its sheet has a progress list, headed "My Progress".
	tiered?: boolean
}

export const ID_PREFIX = 'badges-spoof-'

const ICON_BASE = 'https://raw.githubusercontent.com/dxckie-cell/valenced-plugins/main/plugins/badges-spoof/icons'

function define(
	key: string,
	name: string,
	icon: string,
	phrase?: string,
	extra: Partial<BadgeDefinition> = {},
): BadgeDefinition {
	return {
		key,
		id: `${ID_PREFIX}${key}`,
		name,
		icon,
		url: `${ICON_BASE}/${key}.png`,
		sheetUrl: `${ICON_BASE}/sheet/${key}.png`,
		phrase,
		...extra,
	}
}

const BADGE_CDN = 'https://cdn.discordapp.com/badge-icons'

// In the order they are shown on the profile.
export const BADGES: BadgeDefinition[] = [
	define('early-supporter', 'Early Supporter', '7060786766c9c840eb3019e725d2b358', 'Very, very early'),
	define('hypesquad-events', 'HypeSquad Events', 'bf01d1073931f921909045f3a39fd264', 'Very, very early'),
	define('moderator-alumni', 'Moderator Programs Alumni', 'fee1624003e2fee35cb398e125dc479b', 'Lost to time'),
	define('partnered-server-owner', 'Partnered Server Owner', '3f9748e53446a137a052f3454e2de41e', 'Very, very early'),
	define('bug-hunter', 'Bug Hunter', '2717692c7dca7289b35297368a940dd0', 'Very, very early'),
	define('golden-bug-hunter', 'Golden Bug Hunter', '848f79194d4be5ff5f81505cbd0ce1e6', 'Lost to time'),
	define('early-verified-bot-developer', 'Early Verified Bot Developer', '6df5892e0f35b051f8b61eace34f4967', 'iykyk'),
	define('discord-staff', 'Discord Staff', '5e74e9b61934fc1f67c65515d1f7e60d'),
	define('gifting', 'Gifting', '7fe346cfc5da1340087d8759a9e7a395', undefined, {
		tiered: true,
		url: `${BADGE_CDN}/7fe346cfc5da1340087d8759a9e7a395.png`,
		sheetUrl: `${BADGE_CDN}/7fe346cfc5da1340087d8759a9e7a395.png`,
	}),
	define('server-boosting', 'Server Boosting', 'd96ed283b74de75692487b7499fb8d09', undefined, { tiered: true }),
]

export interface Settings {
	// Badges hidden from the profile. Set by long-pressing a badge in Edit Profile.
	hidden: Record<string, boolean>
	// Show every badge instead of only the first six.
	showAll: boolean
	// Your badge order, real and added badges together, by id. Kept on this device only.
	order: string[]
}

export const DEFAULT_SETTINGS: Settings = { hidden: {}, showAll: true, order: [] }

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

// Discord's own sheet text for each badge.
const tier = (key: string, name: string, milestone: string, threshold: number, icon: string) => ({
	key,
	name,
	milestone_text: milestone,
	requirements: [{ threshold }],
	simple_icon_raster_url: icon,
	complex_icon_static_url: icon,
})

const gift = (hash: string) => `${BADGE_CDN}/${hash}.png`
const boost = (n: number) => `${ICON_BASE}/tiers/boost-${n}.png`

const BUILT_IN_DETAILS: Record<string, { name: string; info_label: string; description: string } & Record<string, unknown>> = {
	'early-supporter': {
		name: 'Early Supporter',
		info_label: 'A Nitro original',
		description: 'Unlocked by subscribing to Nitro before 11 October 2018, 3:20:00 AM BST.',
	},
	'hypesquad-events': {
		name: 'HypeSquad Events',
		info_label: 'Boots on the ground',
		description: 'Unlocked by helping Discord at IRL events.',
	},
	'moderator-alumni': {
		name: 'Moderator Programme Alumni',
		info_label: 'Officially certified',
		description: 'Unlocked by completing the Discord Moderator Programme.',
	},
	'partnered-server-owner': {
		name: 'Discord Partner',
		info_label: 'Community leader',
		description: 'Unlocked by being a member of the Discord Partner Programme.',
	},
	'bug-hunter': {
		name: 'Bug Hunter',
		info_label: 'Carefully observant',
		description: 'Unlocked by being a valued Discord bug hunter.',
	},
	'golden-bug-hunter': {
		name: 'Golden Bug Hunter',
		info_label: 'A spoonful of knowledge',
		description: 'Unlocked by being an acclaimed Discord bug hunter.',
	},
	'early-verified-bot-developer': {
		name: 'Early Verified Bot Developer',
		info_label: 'Built the foundation',
		description: 'Unlocked by creating a verified bot before 19 August 2020.',
	},
	'discord-staff': {
		name: 'Discord Staff',
		info_label: 'Professional lurker',
		description: 'Unlocked by being a Discord employee.',
	},
	gifting: {
		name: 'Gifting',
		info_label: '44 gifts given',
		description: 'Send 1 gift to unlock this badge.',
		tiers: [
			tier('patron', 'Patron', '1 gift', 1, gift('ac305d1b9481f312ce4419e7f8296558')),
			tier('champion', 'Champion', '2 gifts', 2, gift('8b7792c4f65953d3ff564f23429cb79e')),
			tier('luminary', 'Luminary', '3 gifts', 3, gift('3119f5504b2cd09576a323908c7c3517')),
			tier('icon', 'Icon', '6 gifts', 6, gift('64f2413c9b9803661322aaad25826b62')),
			tier('hero', 'Hero', '10 gifts', 10, gift('77d65b1f210014a11eb1582ee06ab684')),
			tier('legend', 'Legend', '20+ gifts', 20, gift('7fe346cfc5da1340087d8759a9e7a395')),
		],
		current_tier: 'legend',
		next_tier: null,
		progress: [{ current: 44, threshold: 20, progress_helper_text: '44 gifts given' }],
		obtained_at: '2026-04-02T12:00:00.000Z',
		tier_obtained_at: { legend: '2026-04-02T12:00:00.000Z' },
	},
	'server-boosting': {
		name: 'Server Boosting',
		info_label: 'Boosting since 04/04/2020',
		description: 'Boost 1 server to unlock this badge.',
		tiers: [
			tier('boost-1', '', '1 month', 1, boost(1)),
			tier('boost-2', '', '2 months', 2, boost(2)),
			tier('boost-3', '', '3 months', 3, boost(3)),
			tier('boost-4', '', '6 months', 6, boost(4)),
			tier('boost-5', '', '9 months', 9, boost(5)),
			tier('boost-6', '', '12 months', 12, boost(6)),
			tier('boost-7', '', '15 months', 15, boost(7)),
			tier('boost-8', '', '18 months', 18, boost(8)),
			tier('boost-9', '', '24+ months', 24, boost(9)),
		],
		current_tier: 'boost-9',
		next_tier: null,
		progress: [{ current: 79, threshold: 24, progress_helper_text: 'Boosting since 04/04/2020' }],
		obtained_at: '2022-04-04T12:00:00.000Z',
		tier_obtained_at: { 'boost-9': '2022-04-04T12:00:00.000Z' },
	},
}

// Discord's sheet text for a badge, with the MYTHIC rarity every one of these has.
export const getDetails = (key: string) => ({ rarity: 5, is_earnable: false, progress: null, ...BUILT_IN_DETAILS[key] })

export function getOrder(): string[] {
	const order = read().order
	return Array.isArray(order) ? order.filter((id): id is string => typeof id === 'string') : []
}

export function setOrder(order: string[]) {
	storage?.set({ order })?.catch?.((e: unknown) => status('order', `could not save: ${(e as Error)?.message}`))
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
