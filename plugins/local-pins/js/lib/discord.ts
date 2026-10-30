import { ToastActionCreators } from '@valenced/discord/actions'
import { Stores } from '@valenced/discord/flux'
import { lookupModule } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import * as React from 'react'

/** Exports can sit on the module or on `default`. Lookups run at call time, never at module scope. */
export function findExport<T = any>(prop: string, ...also: string[]): T | undefined {
	try {
		const mod: any = lookupModule(withProps(prop, ...also))?.[0]
		return (mod?.[prop] !== undefined ? mod : mod?.default) as T | undefined
	} catch {
		return undefined
	}
}

/** Toast that works across Discord's three toast signatures (see the Next plugin repo notes). */
export function toast(content: string, key = 'LocalPinsToast') {
	try {
		const creators = ToastActionCreators as any
		const mana = { text: content }
		if (typeof creators.openMana === 'function') creators.openMana(key, mana)
		else creators.open({ key, content }, mana)
	} catch {
		/* a missing toast must never crash */
	}
}

export function jumpToMessage(channelId: string, messageId: string) {
	const channel = (Stores as any).ChannelStore?.getChannel?.(channelId)
	const path = `/channels/${channel?.guild_id ?? '@me'}/${channelId}/${messageId}`
	const routing = findExport('transitionToGuild')
	try {
		if (typeof routing?.transitionTo === 'function') return routing.transitionTo(path)
	} catch {}
	try {
		if (channel?.guild_id) routing?.transitionToGuild?.(channel.guild_id)
		else findExport('selectPrivateChannel')?.selectPrivateChannel?.(channelId)
		findExport('jumpToMessage')?.jumpToMessage?.({
			channelId,
			messageId,
			flash: true,
			jumpType: 'ANIMATED',
		})
	} catch {}
}

export interface LoadedPin {
	pin: { channelId: string; id: string }
	message?: any
	channel?: any
}

/** Loads the pinned messages (from cache, else fetched). Missing ones come back without `message`. */
export function useLoadedPins(pins: { channelId: string; id: string }[]) {
	const [data, setData] = React.useState<LoadedPin[] | null>(null)
	const key = pins.map(p => p.id).join(',')

	React.useEffect(() => {
		let alive = true
		;(async () => {
			const stores = Stores as any
			// all pins load in parallel, in pin order
			const out: LoadedPin[] = await Promise.all(
				pins.map(async pin => {
					let message = stores.MessageStore?.getMessage?.(pin.channelId, pin.id)
					if (!message) {
						try {
							const id = BigInt(pin.id)
							await findExport('fetchMessages')?.fetchMessages?.({
								channelId: pin.channelId,
								before: (id + 1n).toString(),
								after: (id - 1n).toString(),
								limit: 1,
							})
							message = stores.MessageStore?.getMessage?.(pin.channelId, pin.id)
						} catch {
							/* deleted or no access */
						}
					}
					return { pin, message, channel: stores.ChannelStore?.getChannel?.(pin.channelId) }
				}),
			)
			if (alive) setData(out)
		})().catch(() => alive && setData([]))
		return () => {
			alive = false
		}
	}, [key])

	return data
}
