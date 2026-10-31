import {
	BADGES,
	type BadgeDefinition,
	getDetails,
	getVersion,
	ID_PREFIX,
	isHidden,
	setDetails,
	status,
} from './state'

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

// Copied details without the "Unlocked by ..." line: any text that starts that way is dropped,
// wherever it is in the copy. The list it may be built from is emptied where it is used.
function withoutUnlockText(value: unknown, depth = 0): any {
	if (Array.isArray(value)) {
		return depth < 6 ? value.map(item => withoutUnlockText(item, depth + 1)) : value
	}
	if (!isRecord(value) || depth >= 6) return value

	const result: Row = {}
	for (const [key, item] of Object.entries(value)) {
		if (typeof item === 'string' && /^\s*unlocked\b/i.test(item)) continue
		result[key] = withoutUnlockText(item, depth + 1)
	}
	return result
}

// A badge as it is in the "Customise your badges" list on the edit profile screen, and in the
// sheet that opens when it is tapped. Where Discord's own details were copied from another
// profile they are used as they are, with only the ownership, visibility and icon changed.
export const asCatalogBadge = (badge: BadgeDefinition) => ({
	name: badge.name,
	info_label: badge.name,
	description: badge.name,
	tiers: [],
	current_tier: null,
	next_tier: null,
	...withoutUnlockText(getDetails(badge.key)),
	requirements: [],
	badge_id: badge.id,
	owned: true,
	hidden: isHidden(badge.key),
	simple_icon_raster_url: badge.url,
	complex_icon_static_url: badge.url,
})

// Badges whose details are already being saved, so each is only saved once.
const saving = new Set<string>()

/**
 * Looks at a badge Discord loaded for someone else. If it is one of ours that copies details,
 * and they were not copied yet, they are saved. The badge is recognised by its icon file name
 * appearing anywhere in it, so this does not depend on Discord's field names.
 */
export function learn(entry: unknown) {
	try {
		if (!isRecord(entry) || isOurId(entry.badge_id)) return

		const wanted = BADGES.filter(
			badge => badge.copyDetails && !saving.has(badge.key) && !getDetails(badge.key),
		)
		if (!wanted.length) return

		const text = JSON.stringify(entry)
		if (!text || text.length > 50_000) return

		for (const badge of wanted) {
			if (!text.includes(badge.icon)) continue

			saving.add(badge.key)
			const copy = JSON.parse(text)

			// Not while Discord is drawing: saving redraws the badge lists.
			setTimeout(() => {
				setDetails(badge.key, copy)
				status(`details ${badge.key}`, `${badge.name}: details copied`)
			}, 0)
		}
	} catch {
		// Anything odd is skipped.
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
