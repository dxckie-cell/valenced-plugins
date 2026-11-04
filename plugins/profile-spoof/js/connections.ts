import { getSettings } from './state'

// Connected accounts added to your own profile on this device only. They are not linked accounts.
export interface Connection {
	id: string
	type: string
	name: string
}

export const PLATFORMS: { type: string; label: string }[] = [
	{ type: 'tiktok', label: 'TikTok' },
	{ type: 'instagram', label: 'Instagram' },
	{ type: 'twitter', label: 'X' },
	{ type: 'youtube', label: 'YouTube' },
	{ type: 'twitch', label: 'Twitch' },
	{ type: 'github', label: 'GitHub' },
	{ type: 'spotify', label: 'Spotify' },
	{ type: 'steam', label: 'Steam' },
	{ type: 'reddit', label: 'Reddit' },
	{ type: 'facebook', label: 'Facebook' },
	{ type: 'bluesky', label: 'Bluesky' },
	{ type: 'xbox', label: 'Xbox' },
	{ type: 'playstation', label: 'PlayStation' },
	{ type: 'epicgames', label: 'Epic Games' },
	{ type: 'riotgames', label: 'Riot Games' },
	{ type: 'roblox', label: 'Roblox' },
]

export const platformLabel = (type: string) => PLATFORMS.find(item => item.type === type)?.label ?? type

export function getConnections(): Connection[] {
	const list = getSettings().connections
	return Array.isArray(list)
		? list.filter(item => item && typeof item.type === 'string' && typeof item.name === 'string' && typeof item.id === 'string')
		: []
}

const copies = new WeakMap<object, { signature: string; copy: any }>()

// Your profile with the added connections after your real ones. One copy per profile and list, so
// React doesn't see a new profile on every render.
export function withConnections(profile: any): any {
	const list = getConnections()
	if (list.length === 0 || typeof profile !== 'object' || profile === null) return profile

	const signature = JSON.stringify(list)
	const cached = copies.get(profile)
	if (cached?.signature === signature) return cached.copy

	try {
		const copy = Object.create(Object.getPrototypeOf(profile), Object.getOwnPropertyDescriptors(profile))
		const real = Array.isArray(profile.connectedAccounts) ? profile.connectedAccounts : []
		const added = list
			.filter(item => !real.some((r: any) => r?.type === item.type && String(r?.name).toLowerCase() === item.name.toLowerCase()))
			.map(item => ({
				type: item.type,
				id: item.id,
				name: item.name,
				verified: true,
				revoked: false,
				visibility: 1,
				metadata_visibility: 1,
				show_activity: false,
				friend_sync: false,
			}))
		Object.defineProperty(copy, 'connectedAccounts', {
			value: [...real, ...added],
			enumerable: true,
			configurable: true,
			writable: true,
		})
		copies.set(profile, { signature, copy })
		return copy
	} catch {
		return profile
	}
}
