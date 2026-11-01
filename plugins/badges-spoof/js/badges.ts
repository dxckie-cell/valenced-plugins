import {
	BADGES,
	type BadgeDefinition,
	getDetails,
	getOrder,
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
		const native = original.filter(item => !(isRecord(item) && isOurId(item.id)))
		const ours = active(false).map(asBadge)

		const merged = ours.length ? [...native, ...ours] : native.length === original.length ? original : native
		return inSavedOrder(merged, badgeIdOf)
	})
}

// The badge catalog. The edit profile screen needs the hidden ones too, to show them dimmed.
export function withCatalog(original: unknown[], includeHidden: boolean): unknown[] {
	return cached(original, includeHidden ? 'catalog-all' : 'catalog-shown', () => {
		const native = original.filter(item => !(isRecord(item) && isOurId(item.badge_id)))
		const ours = active(includeHidden).map(badge => asCatalogBadge(badge))

		const merged = ours.length ? [...native, ...ours] : native.length === original.length ? original : native
		return inSavedOrder(merged, item => badgeIdOf(isRecord(item) && item.badge_id !== undefined ? item.badge_id : item))
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
