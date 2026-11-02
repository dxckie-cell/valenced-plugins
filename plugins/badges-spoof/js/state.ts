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
		url: `${ICON_BASE}/gifting.png?v=3`,
		sheetUrl: `${ICON_BASE}/gifting.png?v=3`,
	}),
	define('account-age', 'Account Age', '1d8caace0299b12bcc469c35ce927e838abd9c645a22fe7c556f4394e57fa79b', undefined, {
		tiered: true,
		sheetUrl: `${ICON_BASE}/account-age.png`,
	}),
	define('nitro', 'Nitro', 'f61ddf640d11d9bdfaf9de265eb862edf28986b659e545f293b54adf229433af', undefined, {
		tiered: true,
		sheetUrl: `${ICON_BASE}/nitro.png`,
	}),
	define('server-boosting', 'Server Boosting', 'd96ed283b74de75692487b7499fb8d09', undefined, {
		tiered: true,
		sheetUrl: `${ICON_BASE}/boosting-tile.png`,
	}),
]

export interface Settings {
	// Badges hidden from the profile. Set by long-pressing a badge in Edit Profile.
	hidden: Record<string, boolean>
	// Show every badge instead of only the first six.
	showAll: boolean
	// Your badge order, real and added badges together, by id. Kept on this device only.
	order: string[]
	// What the real Account Age badge goes by (ids, icon file names), learnt from the badge list, so
	// it can be left out before that list has been opened again.
	replaced: string[]
	// Which Nitro level the Nitro badge shows: "none" or a level key from NITRO_LEVELS.
	nitroLevel: string
	// The level each tiered badge shows, by badge key (Gifting, Server Boosting): a tier key.
	levels: Record<string, string>
	// The flash over the Nitro sheet picture (on unless turned off).
	animateSheet: boolean
	// Let Discord draw its own (animated) Nitro badge for the chosen level instead of ours.
	nativeNitro: boolean
	// Show only the badges added here, not the ones Discord gives you.
	hideReal: boolean
	// The text and dates on the sheets, by field id (see TEXT_FIELDS).
	texts: Record<string, string>
}

export const DEFAULT_SETTINGS: Settings = {
	hidden: {},
	showAll: true,
	order: [],
	replaced: [],
	nitroLevel: 'opal',
	levels: {},
	nativeNitro: false,
	animateSheet: true,
	hideReal: false,
	texts: {},
}

let storage: JsonStorage<Settings> | undefined

export function setStorage(value: JsonStorage<Settings> | undefined) {
	storage = value
}

function read(): Partial<Settings> {
	return (storage?.cache as Partial<Settings> | undefined) ?? {}
}

// The Nitro levels, lowest first. "none" turns the badge off.
export const NITRO_LEVELS = [
	{ key: 'none', label: 'None' },
	{ key: 'starter', label: 'Nitro' },
	{ key: 'bronze', label: 'Bronze' },
	{ key: 'silver', label: 'Silver' },
	{ key: 'gold', label: 'Gold' },
	{ key: 'platinum', label: 'Platinum' },
	{ key: 'diamond', label: 'Diamond' },
	{ key: 'emerald', label: 'Emerald' },
	{ key: 'ruby', label: 'Ruby' },
	{ key: 'opal', label: 'Opal' },
] as const

export function getNitroLevel(): string {
	const level = read().nitroLevel
	return NITRO_LEVELS.some(item => item.key === level) ? (level as string) : 'opal'
}

// Give our Nitro badge the id of Discord's own Nitro badge, so Discord draws it (animated).
export const usesNativeNitro = () => read().nativeNitro === true && getNitroLevel() !== 'none'

// The id Discord gives a Nitro badge for the level. Discord draws a badge with one of these ids
// its own way (animated) whatever picture it is given.
export function nativeNitroId(): string {
	const months = NITRO_MONTHS[getNitroLevel()] ?? 0
	return months > 0 ? `premium_tenure_${months}_month_v2` : 'premium'
}

// The profile fields that make Discord treat you as a Nitro subscriber since the level's start.
export function nativeNitroFields(): Record<string, unknown> {
	const months = NITRO_MONTHS[getNitroLevel()] ?? 0
	const since = new Date()
	since.setMonth(since.getMonth() - months)
	since.setHours(12, 0, 0, 0)
	return { premiumType: 2, premium_type: 2, premiumSince: since, premium_since: since.toISOString() }
}

export function nativeNitroLabel(): string {
	const since = textOf('nitro.since')
	return `Subscriber since ${since}`
}

export const animatesSheet = () => read().animateSheet !== false

export const hidesReal = () => read().hideReal === true

// The numbers and dates on the sheets that can be changed in settings.
export const TEXT_FIELDS = [
	{ id: 'gifting.count', badge: 'gifting', label: 'Gifts given', placeholder: '44' },
	{ id: 'gifting.date', badge: 'gifting', label: 'Gifting unlocked on', placeholder: '02/04/26' },
	{ id: 'account-age.age', badge: 'account-age', label: 'Account age', placeholder: '10 years, 6 months' },
	{ id: 'account-age.date', badge: 'account-age', label: 'Account Age unlocked on', placeholder: '02/04/26' },
	{ id: 'nitro.since', badge: 'nitro', label: 'Nitro subscriber since', placeholder: '04/04/2020' },
	{ id: 'nitro.date', badge: 'nitro', label: 'Nitro unlocked on', placeholder: '04/04/26' },
	{ id: 'server-boosting.since', badge: 'server-boosting', label: 'Boosting since', placeholder: '04/04/2020' },
	{ id: 'server-boosting.date', badge: 'server-boosting', label: 'Server Boosting unlocked on', placeholder: '04/04/22' },
] as const

const textOf = (id: string): string => {
	const field = TEXT_FIELDS.find(item => item.id === id)
	const value = read().texts?.[id]
	return (typeof value === 'string' && value.trim()) || field?.placeholder || ''
}

// "02/04/26" or "02/04/2026" (day/month/year) as the date the sheets are given.
function isoDate(text: string, fallback: string): string {
	const match = /^\s*(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})\s*$/.exec(text)
	if (!match) return fallback
	const [day, month, rawYear] = [Number(match[1]), Number(match[2]), Number(match[3])]
	const year = rawYear < 100 ? 2000 + rawYear : rawYear
	if (month < 1 || month > 12 || day < 1 || day > 31) return fallback
	return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00.000Z`
}

const datesFor = (keys: string[], iso: string) => Object.fromEntries(keys.map(key => [key, iso]))

// Looked up at call time, so changes apply without reloading.
export function isHidden(key: string): boolean {
	if (key === 'nitro' && getNitroLevel() === 'none') return true
	const hidden = read().hidden
	return Boolean(hidden && typeof hidden === 'object' && hidden[key] === true)
}

export const showsAll = () => read().showAll !== false

// Discord's own sheet text for each badge.
// `big` is the larger art the sheet header shows when this is the current tier.
const tier = (key: string, name: string | undefined, milestone: string, threshold: number, icon: string, big = icon) => ({
	key,
	name,
	milestone_text: milestone,
	requirements: [{ threshold }],
	// The sheet greys out and locks a level unless Discord sees it as earned, and which field says so
	// is not known, so the likely ones are all set.
	owned: true,
	unlocked: true,
	obtained: true,
	simple_icon_url: icon,
	simple_icon_raster_url: icon,
	complex_icon_static_url: big,
})

const gift = (hash: string) => `${BADGE_CDN}/${hash}.png`
const nitro = (k: string) => `${ICON_BASE}/tiers/nitro-${k}.png`
const age = (k: string) => `${ICON_BASE}/tiers/age-${k}.png`
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
			tier('legend', 'Legend', '20+ gifts', 20, gift('7fe346cfc5da1340087d8759a9e7a395'), `${ICON_BASE}/sheet/gifting.png?v=4`),
		],
		current_tier: 'legend',
		next_tier: null,
		progress: [1, 2, 3, 6, 10, 20].map(threshold => ({ current: 44, threshold, progress_helper_text: '44 gifts given' })),
		obtained_at: '2026-04-02T12:00:00.000Z',
		tier_obtained_at: Object.fromEntries(['patron', 'champion', 'luminary', 'icon', 'hero', 'legend'].map(k => [k, '2026-04-02T12:00:00.000Z'])),
	},
	'account-age': {
		name: 'Account Age',
		info_label: '10 years, 6 months',
		description: 'Keep an active Discord account to level up this badge. Time will do the rest.',
		tiers: [
			tier('seed', 'Seed', '1 year', 1, age('seed')),
			tier('sprout', 'Sprout', '2 years', 2, age('sprout')),
			tier('sapling', 'Sapling', '3 years', 3, age('bud')),
			tier('bud', 'Bud', '4 years', 4, age('sapling')),
			tier('blossom', 'Blossom', '5 years', 5, age('blossom')),
			tier('redwood', 'Redwood', '6 years', 6, age('redwood')),
			tier('sequoia', 'Sequoia', '7 years', 7, age('sequoia')),
			tier('bristlecone', 'Bristlecone', '8 years', 8, age('bristlecone')),
			tier('stromatolite', 'Stromatolite', '9 years', 9, age('stromatolite')),
			tier('primordial', 'Primordial', '10+ years', 10, age('primordial'), `${ICON_BASE}/sheet/account-age.png?v=2`),
		],
		current_tier: 'primordial',
		next_tier: null,
		progress: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(threshold => ({ current: 10, threshold, progress_helper_text: '10 years, 6 months' })),
		obtained_at: '2026-04-02T12:00:00.000Z',
		tier_obtained_at: Object.fromEntries(
			['seed', 'sprout', 'sapling', 'bud', 'blossom', 'redwood', 'sequoia', 'bristlecone', 'stromatolite', 'primordial'].map(k => [k, '2026-04-02T12:00:00.000Z']),
		),
	},
	nitro: {
		name: 'Nitro',
		info_label: 'Subscriber since 04/04/2020',
		description: 'Subscribe to Nitro to unlock this badge.',
		tiers: [
			tier('starter', 'Nitro Starter', '', 0, nitro('starter'), `${ICON_BASE}/sheet/nitro-starter.png?v=1`),
			tier('bronze', 'Nitro Bronze', '1 month', 1, nitro('bronze'), `${ICON_BASE}/sheet/nitro-bronze.png?v=1`),
			tier('silver', 'Nitro Silver', '3 months', 3, nitro('silver'), `${ICON_BASE}/sheet/nitro-silver.png?v=1`),
			tier('gold', 'Nitro Gold', '6 months', 6, nitro('gold'), `${ICON_BASE}/sheet/nitro-gold.png?v=1`),
			tier('platinum', 'Nitro Platinum', '1 year', 12, nitro('platinum'), `${ICON_BASE}/sheet/nitro-platinum.png?v=1`),
			tier('diamond', 'Nitro Diamond', '2 years', 24, nitro('diamond'), `${ICON_BASE}/sheet/nitro-diamond.png?v=1`),
			tier('emerald', 'Nitro Emerald', '3 years', 36, nitro('emerald'), `${ICON_BASE}/sheet/nitro-emerald.png?v=1`),
			tier('ruby', 'Nitro Ruby', '5 years', 60, nitro('ruby'), `${ICON_BASE}/sheet/nitro-ruby.png?v=1`),
			tier('opal', 'Nitro Opal', '6+ years', 72, nitro('opal'), `${ICON_BASE}/sheet/nitro-opal.png?v=1`),
		],
		current_tier: 'opal',
		next_tier: null,
		progress: [0, 1, 3, 6, 12, 24, 36, 60, 72].map(threshold => ({ current: 79, threshold, progress_helper_text: 'Subscriber since 04/04/2020' })),
		obtained_at: '2026-04-04T12:00:00.000Z',
		tier_obtained_at: Object.fromEntries(['starter', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'emerald', 'ruby', 'opal'].map(k => [k, '2026-04-04T12:00:00.000Z'])),
	},
	'server-boosting': {
		name: 'Server Boosting',
		info_label: 'Boosting since 04/04/2020',
		description: 'Boost 1 server to unlock this badge.',
		tiers: [
			tier('boost-1', undefined, '1 month', 1, boost(1)),
			tier('boost-2', undefined, '2 months', 2, boost(2)),
			tier('boost-3', undefined, '3 months', 3, boost(3)),
			tier('boost-4', undefined, '6 months', 6, boost(4)),
			tier('boost-5', undefined, '9 months', 9, boost(5)),
			tier('boost-6', undefined, '12 months', 12, boost(6)),
			tier('boost-7', undefined, '15 months', 15, boost(7)),
			tier('boost-8', undefined, '18 months', 18, boost(8)),
			tier('boost-9', undefined, '24+ months', 24, boost(9), `${ICON_BASE}/sheet/server-boosting.png?v=3`),
		],
		current_tier: 'boost-9',
		next_tier: null,
		progress: [1, 2, 3, 6, 9, 12, 15, 18, 24].map(threshold => ({ current: 79, threshold, progress_helper_text: 'Boosting since 04/04/2020' })),
		obtained_at: '2022-04-04T12:00:00.000Z',
		tier_obtained_at: Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => [`boost-${n}`, '2022-04-04T12:00:00.000Z'])),
	},
}

// The levels of Gifting and Server Boosting, lowest first, for the level pickers in settings.
export const levelChoices = (key: string): { key: string; label: string; icon: string; threshold: number }[] =>
	((BUILT_IN_DETAILS[key]?.tiers as any[]) ?? []).map(item => ({
		key: item.key,
		label: item.name ?? item.milestone_text,
		icon: item.simple_icon_url,
		threshold: item.requirements[0].threshold,
	}))

export function getLevel(key: string): string {
	const choices = levelChoices(key)
	const chosen = read().levels?.[key]
	return choices.some(item => item.key === chosen) ? (chosen as string) : choices[choices.length - 1]?.key
}

// Discord's sheet text for a badge, with the MYTHIC rarity every one of these has.
const NITRO_MONTHS: Record<string, number> = { starter: 0, bronze: 1, silver: 3, gold: 6, platinum: 12, diamond: 24, emerald: 36, ruby: 60, opal: 72 }
const NITRO_ORDER = Object.keys(NITRO_MONTHS)

// Where a tiered badge stands at the level chosen in settings.
function levelState(key: string, base: Record<string, any>) {
	const keys: string[] = base.tiers.map((item: any) => item.key)
	const level = getLevel(key)
	const at = keys.indexOf(level)
	return {
		level,
		next: keys[at + 1] ?? null,
		reached: keys.slice(0, at + 1),
		top: at === keys.length - 1,
		threshold: base.tiers[at].requirements[0].threshold as number,
	}
}

// The sheet text for a badge, with the numbers and dates from settings filled in.
function withSettings(key: string, base: Record<string, any> | undefined): Record<string, any> | undefined {
	if (!base) return base

	if (key === 'gifting') {
		const count = textOf('gifting.count')
		const iso = isoDate(textOf('gifting.date'), base.obtained_at)
		const lv = levelState(key, base)
		// Without a count of your own, the count is the one the level needs.
		const own = (read().texts?.['gifting.count'] ?? '').trim()
		const shown = own || (lv.top ? count : String(lv.threshold))
		const current = Number(shown.replace(/[^0-9.]/g, '')) || 0
		return {
			...base,
			info_label: `${shown} gifts given`,
			current_tier: lv.level,
			next_tier: lv.next,
			progress: base.progress.map((item: any) => ({ ...item, current, progress_helper_text: `${shown} gifts given` })),
			obtained_at: iso,
			tier_obtained_at: datesFor(lv.reached, iso),
		}
	}

	if (key === 'account-age') {
		const age = textOf('account-age.age')
		const iso = isoDate(textOf('account-age.date'), base.obtained_at)
		return {
			...base,
			info_label: age,
			progress: base.progress.map((item: any) => ({ ...item, progress_helper_text: age })),
			obtained_at: iso,
			tier_obtained_at: datesFor(Object.keys(base.tier_obtained_at), iso),
		}
	}

	if (key === 'server-boosting') {
		const since = textOf('server-boosting.since')
		const iso = isoDate(textOf('server-boosting.date'), base.obtained_at)
		const lv = levelState(key, base)
		return {
			...base,
			info_label: `Boosting since ${since}`,
			current_tier: lv.level,
			next_tier: lv.next,
			progress: base.progress.map((item: any) => ({ ...item, current: lv.threshold, progress_helper_text: `Boosting since ${since}` })),
			obtained_at: iso,
			tier_obtained_at: datesFor(lv.reached, iso),
		}
	}

	if (key === 'nitro') {
		const since = textOf('nitro.since')
		const iso = isoDate(textOf('nitro.date'), base.obtained_at)
		const level = getNitroLevel() === 'none' ? 'opal' : getNitroLevel()
		const at = NITRO_ORDER.indexOf(level)
		const reached = NITRO_ORDER.slice(0, at + 1)
		return {
			...base,
			info_label: `Subscriber since ${since}`,
			current_tier: level,
			next_tier: NITRO_ORDER[at + 1] ?? null,
			progress: base.progress.map((item: any) => ({
				...item,
				current: NITRO_MONTHS[level],
				progress_helper_text: `Subscriber since ${since}`,
			})),
			obtained_at: iso,
			tier_obtained_at: datesFor(reached, iso),
		}
	}

	return base
}

// Discord's own levels of each badge (with their animated pictures), learnt from its badge list.
const realTiers = new Map<string, any[]>()
let artVersion = 0
export const getArtVersion = () => artVersion

export function learnTiers(key: string, tiers: unknown) {
	if (!Array.isArray(tiers) || !tiers.length || realTiers.get(key) === tiers) return
	if (!tiers.some((item: any) => item && (typeof item.complex_icon_animated_url === 'string' || typeof item.complex_icon_static_url === 'string'))) return
	realTiers.set(key, tiers)
	artVersion++
}

const norm = (value: unknown) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')

// Adds the animated picture of Discord's own level to each of ours, matched by name, or by place when
// both have as many levels.
function withRealArt(key: string, details: Record<string, any> | undefined) {
	const real = realTiers.get(key)
	if (!details?.tiers || !real) return details
	let currentReal: any
	const tiers = details.tiers.map((mine: any, index: number) => {
		const word = norm(mine.key)
		const found =
			real.find((item: any) => word && (norm(item.key) === word || norm(item.name).endsWith(word))) ??
			(real.length === details.tiers.length ? real[index] : undefined)
		if (!found) return mine
		if (mine.key === details.current_tier) currentReal = found
		const { rarity: _ours, ...rest } = mine
		return {
			...rest,
			// How rare Discord calls this level (Starter has none).
			...(typeof found.rarity === 'number' ? { rarity: found.rarity } : {}),
			...(found.complex_icon_animated_url ? { complex_icon_animated_url: found.complex_icon_animated_url } : {}),
			// Nitro's own picture is used outright; it is drawn at the right size without our scaling.
			...(key === 'nitro' && found.complex_icon_static_url ? { complex_icon_static_url: found.complex_icon_static_url } : {}),
		}
	})
	const current = tiers.find((item: any) => item.key === details.current_tier)
	return {
		...details,
		tiers,
		...(currentReal ? { rarity: typeof currentReal.rarity === 'number' ? currentReal.rarity : undefined } : {}),
		...(current?.complex_icon_animated_url ? { complex_icon_animated_url: current.complex_icon_animated_url } : {}),
		...(key === 'nitro' && current?.complex_icon_static_url ? { complex_icon_static_url: current.complex_icon_static_url } : {}),
	}
}

export const getDetails = (key: string) => ({
	rarity: 5,
	is_earnable: false,
	progress: null,
	...withRealArt(key, withSettings(key, BUILT_IN_DETAILS[key])),
})

export function getOrder(): string[] {
	const order = read().order
	return Array.isArray(order) ? order.filter((id): id is string => typeof id === 'string') : []
}

export function getReplaced(): string[] {
	const replaced = read().replaced
	return Array.isArray(replaced) ? replaced.filter((id): id is string => typeof id === 'string') : []
}

export function setReplaced(replaced: string[]) {
	storage?.set({ replaced })?.catch?.((e: unknown) => status('settings', `could not save: ${(e as Error)?.message}`))
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

// The Nitro badge's icon follows the level chosen in settings.
const nitroBadge = BADGES.find(badge => badge.key === 'nitro')
if (nitroBadge) {
	const icon = () => `${ICON_BASE}/nitro-${getNitroLevel() === 'none' ? 'opal' : getNitroLevel()}.png`
	Object.defineProperties(nitroBadge, {
		url: { get: icon, enumerable: true, configurable: true },
		sheetUrl: { get: icon, enumerable: true, configurable: true },
	})
}

// Gifting and Server Boosting show the icon of the level chosen in settings.
for (const key of ['gifting', 'server-boosting']) {
	const badge = BADGES.find(item => item.key === key)
	if (!badge) continue
	const base = { url: badge.url, sheetUrl: badge.sheetUrl }
	const pick = (field: 'url' | 'sheetUrl') => () => {
		const choices = levelChoices(key)
		const level = getLevel(key)
		if (level === choices[choices.length - 1]?.key) return base[field]
		return choices.find(item => item.key === level)?.icon ?? base[field]
	}
	Object.defineProperties(badge, {
		url: { get: pick('url'), enumerable: true, configurable: true },
		sheetUrl: { get: pick('sheetUrl'), enumerable: true, configurable: true },
	})
}

// Sheet pictures drawn bigger than their box, by file: Nitro's wings are wider than the others.
const SHEET_SCALES: Record<string, number> = {
	'sheet/nitro-opal.png': 1.4,
	'sheet/nitro-ruby.png': 1.3,
	'sheet/nitro-emerald.png': 1.2,
	'sheet/nitro-diamond.png': 1.1,
}

export const sheetScaleFor = (uri: string): number | undefined => {
	const path = uri.split('?')[0]
	return Object.entries(SHEET_SCALES).find(([file]) => path.endsWith(file))?.[1]
}
