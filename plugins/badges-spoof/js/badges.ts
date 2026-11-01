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


// Account Age is replaced: Discord's own one (the real Account Age) is left out so there is only
// one. What it is called is learnt from the badge list and kept for next time.
const REPLACED_NAME = 'Account Age'
// Every level of it, so whichever one the real badge is on (1 to 10 years) is left out.
const AGE_LEVELS = new Set(['Seed', 'Sprout', 'Sapling', 'Bud', 'Blossom', 'Redwood', 'Sequoia', 'Bristlecone', 'Stromatolite', 'Primordial'])
const ours = 'badges-spoof-account-age'
const replaced = new Set<string>()
let replacedSaved = false

const replacedKeys = () => {
	if (!replacedSaved) {
		replacedSaved = true
		for (const key of getReplaced()) replaced.add(key)
	}
	return replaced
}

function learnReplaced(item: Row) {
	const keys = replacedKeys()
	const before = keys.size
	const id = badgeIdOf(item.badge_id)
	if (id) keys.add(id)
	for (const source of [item, ...(Array.isArray(item.tiers) ? item.tiers : [])]) {
		if (!isRecord(source)) continue
		for (const url of [source.simple_icon_url, source.simple_icon_raster_url, source.complex_icon_static_url]) {
			const hash = hashOf(url)
			if (hash) keys.add(hash)
		}
	}
	// Saved later, not while Discord is drawing.
	if (keys.size !== before) setTimeout(() => setReplaced([...keys]), 0)
}

const isRealAge = (item: unknown) => {
	if (!isRecord(item) || isOurId(item.badge_id ?? item.id)) return false
	const keys = replacedKeys()
	const id = badgeIdOf(item)
	const icon = typeof item.icon === 'string' ? item.icon : undefined
	return (
		item.name === REPLACED_NAME ||
		item.description === REPLACED_NAME ||
		AGE_LEVELS.has(item.description) ||
		AGE_LEVELS.has(item.name) ||
		Boolean(id && keys.has(id)) ||
		Boolean(icon && keys.has(icon))
	)
}

// Our Account Age takes the place the real one had in your order, until you move it yourself.
function inPlaceOfReal(id: string | undefined, known: Set<string>) {
	if (id !== ours || known.has(ours)) return id
	return getOrder().find(saved => replacedKeys().has(saved)) ?? id
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
		const native = original.filter(item => !(isRecord(item) && isOurId(item.id)) && !isRealAge(item))
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
		for (const item of original) if (isRecord(item) && !isOurId(item.badge_id) && item.name === REPLACED_NAME) learnReplaced(item)
		const native = original.filter(item => !(isRecord(item) && isOurId(item.badge_id)) && !isRealAge(item))
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
