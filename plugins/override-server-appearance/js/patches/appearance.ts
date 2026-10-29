import { instead } from '@valenced/patcher'
import { withModule } from '../lib/modules'
import type { ServerOverride, Storage } from '../lib/storage'
import type { JsonStorage } from '@valenced/json-storage'

type Kind = 'icon' | 'banner'

// Hashes that only make Discord draw an icon / banner for servers that have none of their own.
// The image shown always comes from the override.
const PLACEHOLDER: Record<Kind, string> = {
	icon: 'override-server-icon',
	banner: 'override-server-banner',
}

let guildStore: any

export function patchAppearance(storage: JsonStorage<Storage>): () => void {
	const unpatches: (() => void)[] = []
	const add = (fn: (() => void) | void) => {
		if (typeof fn === 'function') unpatches.push(fn)
	}

	// Read on every call, so edits in settings apply without a reload.
	const overrides = (): ServerOverride[] => storage.cache?.overrides ?? []

	const getUrl = (id: string | undefined, kind: Kind): string | undefined => {
		if (!id) return
		for (const entry of overrides()) {
			if (entry?.id?.trim() === id) {
				const url = entry[kind]?.trim()
				if (url) return url
			}
		}
	}

	const idOf = (target: any): string | undefined => (typeof target === 'string' ? target : target?.id)

	// 1. The functions Discord builds every server icon / banner with.
	add(
		withModule('utils/AvatarUtils.tsx', (u: any) => typeof u.getGuildIconURL === 'function', (utils: any) => {
			const hook = (name: string, kind: Kind, source: boolean) => {
				if (typeof utils?.[name] !== 'function') return
				unpatches.push(
					instead(utils, name, (args: any[], original: any) => {
						const url = getUrl(idOf(args[0]), kind)
						if (!url) return original(...args)
						return source ? { uri: url } : url
					}),
				)
			}

			hook('getGuildIconURL', 'icon', false)
			hook('getGuildIconSource', 'icon', true)
			hook('getGuildBannerURL', 'banner', false)
			hook('getGuildBannerSource', 'banner', true)
			refresh()
		}),
	)

	// 2. Servers without an icon or banner are only drawn with one if the server has a hash,
	// so overridden servers are handed out as copies that carry a placeholder.
	const copies = new WeakMap<object, { sig: string; value: any }>()

	const decorate = (guild: any) => {
		if (!guild?.id) return guild

		const icon = !guild.icon && !!getUrl(guild.id, 'icon')
		const banner = !guild.banner && !!getUrl(guild.id, 'banner')
		if (!icon && !banner) return guild

		const sig = `${+icon}${+banner}`
		const cached = copies.get(guild)
		if (cached?.sig === sig) return cached.value

		const copy = Object.assign({}, guild)
		if (icon) copy.icon = PLACEHOLDER.icon
		if (banner) copy.banner = PLACEHOLDER.banner
		copies.set(guild, { sig, value: copy })
		return copy
	}

	// A copy of a collection is kept per original, so the same input keeps giving the same output.
	const signature = () => overrides().map(o => `${o.id}|${o.icon}|${o.banner}`).join(',')
	const collections = new WeakMap<object, { sig: string; value: any }>()

	const decorateAll = (all: any, map: (all: any) => any) => {
		if (!all || typeof all !== 'object') return all
		const sig = signature()
		const cached = collections.get(all)
		if (cached?.sig === sig) return cached.value

		const value = map(all)
		collections.set(all, { sig, value })
		return value
	}

	add(
		withModule('stores/GuildStore.tsx', (s: any) => typeof s.getGuild === 'function', (store: any) => {
			guildStore = store
			unpatches.push(instead(store, 'getGuild', (args: any[], original: any) => decorate(original(...args))))

			if (typeof store.getGuilds === 'function') {
				unpatches.push(
					instead(store, 'getGuilds', (args: any[], original: any) =>
						decorateAll(original(...args), all => {
							const out: Record<string, any> = {}
							for (const id of Object.keys(all)) out[id] = decorate(all[id])
							return out
						}),
					),
				)
			}

			if (typeof store.getGuildsArray === 'function') {
				unpatches.push(
					instead(store, 'getGuildsArray', (args: any[], original: any) =>
						decorateAll(original(...args), all => all.map(decorate)),
					),
				)
			}

			refresh()
		}),
	)

	// Redraw once the saved overrides are in, in case Discord drew the servers first.
	storage.get().then(refresh, () => {})

	return () => {
		for (const unpatch of unpatches.splice(0)) unpatch()
		refresh()
		guildStore = undefined
	}
}

/** Makes Discord redraw servers after the overrides or the patches changed. */
export function refresh() {
	try {
		guildStore?.emitChange?.()
	} catch {
		// the next time a server renders will show it anyway
	}
}
