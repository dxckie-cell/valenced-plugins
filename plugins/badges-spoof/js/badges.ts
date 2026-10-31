import { BADGES, type BadgeDefinition, getVersion, ID_PREFIX, isHidden } from './state'

type Row = Record<string, any>

export const isRecord = (value: unknown): value is Row =>
	typeof value === 'object' && value !== null && !Array.isArray(value)

export const isOurId = (id: unknown): id is string =>
	typeof id === 'string' && id.startsWith(ID_PREFIX)

export const findBadge = (id: unknown): BadgeDefinition | undefined =>
	isOurId(id) ? BADGES.find(badge => badge.id === id) : undefined

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

// A badge as it is in the "Customise your badges" list on the edit profile screen.
export const asCatalogBadge = (badge: BadgeDefinition) => ({
	badge_id: badge.id,
	name: badge.name,
	info_label: badge.name,
	description: badge.name,
	owned: true,
	hidden: isHidden(badge.key),
	simple_icon_raster_url: badge.url,
	complex_icon_static_url: badge.url,
	tiers: [],
	current_tier: null,
	next_tier: null,
	requirements: [],
})

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

		if (!ours.length) return native.length === original.length ? original : native
		return [...native, ...ours]
	})
}

// The badge catalog. The edit profile screen needs the hidden ones too, to show them dimmed.
export function withCatalog(original: unknown[], includeHidden: boolean): unknown[] {
	return cached(original, includeHidden ? 'catalog-all' : 'catalog-shown', () => {
		const native = original.filter(item => !(isRecord(item) && isOurId(item.badge_id)))
		const ours = active(includeHidden).map(asCatalogBadge)

		if (!ours.length) return native.length === original.length ? original : native
		return [...native, ...ours]
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
