import {
	BADGES,
	type BadgeDefinition,
	getDetails,
	getOrder,
	getReplaced,
	setReplaced,
	setOrder,
	getVersion,
	ID_PREFIX,
	isHidden,
} from './state'

type Row = Record<string, any>

export const isRecord = (value: unknown): value is Row =>
	typeof value === 'object' && value !== null && !Array.isArray(value)

export const isOurId = (id: unknown): id is string =>
	typeof id === 'string' && id.startsWith(ID_PREFIX)

export const findBadge = (id: unknown): BadgeDefinition | undefined =>
	isOurId(id) ? BADGES.find(badge => badge.id === id) : undefined

// The grid on the edit profile screen, in the order shown, and each real badge's name -> id so
// the profile (which may call the same badge by another id) can follow the same order.
let gridIds: string[] = []
const nameToId = new Map<string, string>()
// The same for icon file names, for badges the profile words differently ("Subscriber since ...").
const iconToId = new Map<string, string>()

const hashOf = (url: unknown) => (typeof url === 'string' ? /([^/?#]+)\.[a-z]+(?:[?#]|$)/i.exec(url)?.[1] : undefined)

function rememberGrid(list: unknown[]) {
	// Only the badges that are shown: the catalog also lists ones you don't have.
	gridIds = list
		.filter(item => !(isRecord(item) && item.owned === false))
		.map(item => badgeIdOf(isRecord(item) && item.badge_id !== undefined ? item.badge_id : item))
		.filter((id): id is string => Boolean(id))

	for (const item of list) {
		if (!isRecord(item) || isOurId(item.badge_id) || typeof item.name !== 'string') continue
		const id = badgeIdOf(item.badge_id)
		if (!id) continue
		nameToId.set(item.name, id)

		const sources = [item, ...(Array.isArray(item.tiers) ? item.tiers : [])]
		for (const source of sources) {
			if (!isRecord(source)) continue
			for (const url of [source.simple_icon_url, source.simple_icon_raster_url, source.complex_icon_static_url]) {
				const hash = hashOf(url)
				if (hash) iconToId.set(hash, id)
			}
		}
	}
}


// Some badges are replaced: Discord's own one is left out so there is only one of each. What it
// is called is learnt from the badge list and kept for next time.
const REPLACES = [
	{
		ours: 'badges-spoof-account-age',
		name: 'Account Age',
		// Every level, so whichever one the real badge is on is left out.
		levels: ['Seed', 'Sprout', 'Sapling', 'Bud', 'Blossom', 'Redwood', 'Sequoia', 'Bristlecone', 'Stromatolite', 'Primordial'],
		// The icon file of each level.
		icons: [
			'dda73966211a0c16533f8fcd9f1f27c27a628ef562927270e79df9b9c5e6cb12',
			'74e1884f930b0d69986f92aeea77d3ff3d3d00c540f386b63e6ebb382d5e927d',
			'217dab12dcb72d4c95f2863e9dddd5c42003345a001684ea55a736172f32eea1',
			'26b89419a4f562ab31a1a72eac04833aa1026af937f1d53c088ec258df3db84b',
			'1db184b6d10a61a37dc30efdc74d587560fac5291c8bb329977e93bb5a312602',
			'6b0f2ed5be272942eeabea3a0289027d164c7b1ce6a76166d1c928a57db762c5',
			'c095e3e73591843a22dc979d1fcfe3d6cf6841d1f51387d208d19f8bed01deb7',
			'867feeff5acd481c80bae557c586718fb5390bbaaa1cbde55fae296a7884e799',
			'a6f4c487be2aa012f41f1fba40e664f914ede9251f4b967d890ab5c065a29fb7',
			'1d8caace0299b12bcc469c35ce927e838abd9c645a22fe7c556f4394e57fa79b',
		],
	},
	{
		ours: 'badges-spoof-gifting',
		name: 'Gifting',
		levels: ['Patron', 'Champion', 'Luminary', 'Icon', 'Hero', 'Legend'],
		icons: [
			'ac305d1b9481f312ce4419e7f8296558',
			'8b7792c4f65953d3ff564f23429cb79e',
			'3119f5504b2cd09576a323908c7c3517',
			'64f2413c9b9803661322aaad25826b62',
			'77d65b1f210014a11eb1582ee06ab684',
			'7fe346cfc5da1340087d8759a9e7a395',
		],
	},
].map(r => ({ ...r, names: new Set([r.name, ...r.levels]), keys: new Set<string>(r.icons) }))

let replacedLoaded = false

// Saved as "<our id>|<key>".
function loadReplaced() {
	if (replacedLoaded) return
	replacedLoaded = true
	for (const saved of getReplaced()) {
		const [ours, key] = saved.split('|')
		REPLACES.find(r => r.ours === ours)?.keys.add(key)
	}
}

const saveReplaced = () => setReplaced(REPLACES.flatMap(r => [...r.keys].map(key => `${r.ours}|${key}`)))

function learnReplaced(item: Row) {
	loadReplaced()
	const replace = REPLACES.find(r => r.name === item.name)
	if (!replace) return

	const before = replace.keys.size
	const id = badgeIdOf(item.badge_id)
	if (id) replace.keys.add(id)
	for (const source of [item, ...(Array.isArray(item.tiers) ? item.tiers : [])]) {
		if (!isRecord(source)) continue
		for (const url of [source.simple_icon_url, source.simple_icon_raster_url, source.complex_icon_static_url]) {
			const hash = hashOf(url)
			if (hash) replace.keys.add(hash)
		}
	}
	// Saved later, not while Discord is drawing.
	if (replace.keys.size !== before) setTimeout(saveReplaced, 0)
}

// The icon file names a catalog entry (and its levels) point to.
const iconHashes = (item: Row) =>
	[item, ...(Array.isArray(item.tiers) ? item.tiers : [])].flatMap(source =>
		isRecord(source) ? [source.simple_icon_url, source.simple_icon_raster_url, source.complex_icon_static_url].map(hashOf) : [],
	)

const isReplaced = (item: unknown) => {
	if (!isRecord(item) || isOurId(item.badge_id ?? item.id)) return false
	loadReplaced()
	const id = badgeIdOf(item)
	const icons = [item.icon, ...iconHashes(item)].filter((icon): icon is string => typeof icon === 'string')
	return REPLACES.some(
		r =>
			r.names.has(item.name) ||
			r.names.has(item.description) ||
			Boolean(id && r.keys.has(id)) ||
			icons.some(icon => r.keys.has(icon)),
	)
}

// Ours takes the place the real one had in your order, until you move it yourself.
function inPlaceOfReal(id: string | undefined, known: Set<string>) {
	const replace = REPLACES.find(r => r.ours === id)
	if (!replace || known.has(id as string)) return id
	loadReplaced()
	return getOrder().find(saved => replace.keys.has(saved)) ?? id
}

// Moves a badge one place left (-1) or right (1) in the grid. Returns false if it can't.
export function moveBadge(id: string, delta: -1 | 1): boolean {
	const ids = [...gridIds]
	const from = ids.indexOf(id)
	const to = from + delta
	if (from < 0 || to < 0 || to >= ids.length) return false

	;[ids[from], ids[to]] = [ids[to], ids[from]]
	gridIds = ids   // up to date at once, so a second move before Discord redraws is still right
	setOrder(ids)
	return true
}

export const isInGrid = (id: string) => gridIds.includes(id)

// The id of a badge in any of the shapes Discord passes around.
export const badgeIdOf = (item: unknown): string | undefined => {
	const id = isRecord(item) ? (item.id ?? item.badgeId ?? item.badge_id) : item
	return typeof id === 'string' || typeof id === 'number' ? String(id) : undefined
}

// Puts the badges in the order saved on this device. Badges not in it (new ones) go last.
function inSavedOrder<T>(list: T[], idOf: (item: T) => string | undefined): T[] {
	const order = getOrder()
	if (!order.length) return list

	const rank = new Map(order.map((id, index) => [id, index]))
	const rankOf = (item: T) => rank.get(idOf(item) ?? '') ?? Number.POSITIVE_INFINITY
	const sorted = list
		.map((item, index) => ({ item, index }))
		.sort((a, b) => rankOf(a.item) - rankOf(b.item) || a.index - b.index)
		.map(({ item }) => item)

	return sorted.every((item, index) => item === list[index]) ? list : sorted
}

// The badges to add, with or without the ones the user hid.
const active = (includeHidden: boolean) =>
	BADGES.filter(badge => includeHidden || !isHidden(badge.key))

// A badge as it is in the profile's badge list. `icon` is Discord's own icon file name, so the
// profile draws it the same way as a real badge.
const asBadge = (badge: BadgeDefinition) => ({
	id: badge.id,
	description: badge.name,
	icon: badge.icon,
	iconSrc: badge.url,
})

// A badge as it is in the "Customise your badges" list on the edit profile screen, and in the
// sheet that opens when it is tapped.
export const asCatalogBadge = (badge: BadgeDefinition) => {
	const details = getDetails(badge.key)

	return {
		requirements: [],
		tiers: [],
		current_tier: null,
		next_tier: null,
		...details,
		// Legacy badges say so first, as Discord does on other profiles.
		description: badge.phrase ? `Legacy Badge\n${details.description}` : details.description,
		badge_id: badge.id,
		owned: true,
		hidden: isHidden(badge.key),
		// The sheet draws the icon bigger than a tile, so it has its own size.
		simple_icon_raster_url: badge.sheetUrl,
		complex_icon_static_url: badge.sheetUrl,
	}
}

// Discord compares these lists by reference, so the same input gives the same output until a
// setting changes. Returning a fresh list every time would make Discord re-render in a loop.
const memo = new WeakMap<object, Map<string, { version: number; result: unknown[] }>>()

function cached(original: unknown[], kind: string, build: () => unknown[]) {
	const version = getVersion()
	let kinds = memo.get(original)
	if (!kinds) memo.set(original, (kinds = new Map()))

	const hit = kinds.get(kind)
	if (hit?.version === version) return hit.result

	const result = build()
	kinds.set(kind, { version, result })
	return result
}

// The list of badges on a profile, with ours added. Run it on the current user's list only.
export function withBadges(original: unknown[]): unknown[] {
	return cached(original, 'badges', () => {
		const native = original.filter(item => !(isRecord(item) && isOurId(item.id)) && !isReplaced(item))
		const ours = active(false).map(asBadge)

		const merged = ours.length ? [...native, ...ours] : native.length === original.length ? original : native
		const known = new Set(getOrder())
		return inSavedOrder(merged, item => {
			const id = inPlaceOfReal(badgeIdOf(item), known)
			if (id && known.has(id)) return id

			// The same badge can have another id on the profile than in the edit list: go by name.
			const name = isRecord(item) ? (item.description ?? item.name) : undefined
			const icon = isRecord(item) && typeof item.icon === 'string' ? item.icon : undefined
			return (typeof name === 'string' && nameToId.get(name)) || (icon && iconToId.get(icon)) || id
		})
	})
}

// The badge catalog. The edit profile screen needs the hidden ones too, to show them dimmed.
export function withCatalog(original: unknown[], includeHidden: boolean): unknown[] {
	return cached(original, includeHidden ? 'catalog-all' : 'catalog-shown', () => {
		for (const item of original) if (isRecord(item) && !isOurId(item.badge_id) && typeof item.name === 'string') learnReplaced(item)
		const native = original.filter(item => !(isRecord(item) && isOurId(item.badge_id)) && !isReplaced(item))
		const ours = active(includeHidden).map(badge => asCatalogBadge(badge))

		const merged = ours.length ? [...native, ...ours] : native.length === original.length ? original : native
		const known = new Set(getOrder())
		const sorted = inSavedOrder(merged, item => inPlaceOfReal(badgeIdOf(isRecord(item) && item.badge_id !== undefined ? item.badge_id : item), known))
		if (includeHidden) rememberGrid(sorted)
		return sorted
	})
}

// One catalog entry by id, the same object until a setting changes.
const entries = new Map<string, { version: number; entry: ReturnType<typeof asCatalogBadge> }>()

export function catalogEntry(badge: BadgeDefinition) {
	const version = getVersion()
	const hit = entries.get(badge.id)
	if (hit?.version === version) return hit.entry

	const entry = asCatalogBadge(badge)
	entries.set(badge.id, { version, entry })
	return entry
}
