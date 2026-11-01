import { Stores } from '@valenced/discord/flux'
import type { DiscordModules } from '@valenced/discord/types'

export interface EmojiRef {
	id: string
	/** Name from the element that was pressed, if it had one. */
	name?: string
	animated?: boolean
}

interface CustomEmoji {
	id: string
	name: string
	guildId?: string
	animated?: boolean
}

interface Guild {
	id: string
	name: string
	icon?: string | null
	features?: Iterable<string>
}

export interface EmojiInfo {
	id: string
	name: string
	animated: boolean
	imageUrl: string
	guild?: {
		id: string
		name: string
		iconUrl?: string
		/** Discoverable servers can be found without an invite. */
		discoverable: boolean
	}
}

const Cdn = 'https://cdn.discordapp.com'

// Custom emoji images are always served from /emojis/<snowflake>.<ext>
const EmojiUrl = /\/emojis\/(\d{15,25})\.(\w+)/
const Snowflake = /^\d{15,25}$/

const SkippedKeys = new Set(['children', 'style', 'ref', 'key'])

/** Reads the emoji a rendered element stands for, without knowing which component drew it. */
export function emojiFromProps(
	props: Record<string, any> | null | undefined,
): EmojiRef | undefined {
	if (!props) return
	return scan(props, 0)
}

function scan(value: unknown, depth: number): EmojiRef | undefined {
	if (value == null || depth > 4) return

	if (typeof value === 'string') {
		const match = EmojiUrl.exec(value)
		if (match) return { id: match[1]!, animated: match[2] === 'gif' }
		return
	}

	if (typeof value !== 'object') return

	if (Array.isArray(value)) {
		for (const item of value) {
			const found = scan(item, depth + 1)
			if (found) return found
		}
		return
	}

	// React elements and fibers are huge and cyclic
	if ('$$typeof' in value) return

	const object = value as Record<string, any>

	if (typeof object.emojiId === 'string' && Snowflake.test(object.emojiId))
		return {
			id: object.emojiId,
			name: object.emojiName ?? object.name,
			animated: object.animated,
		}

	if (
		typeof object.id === 'string' &&
		Snowflake.test(object.id) &&
		(object.type === 'customEmoji' ||
			object.type === 'emoji' ||
			typeof object.animated === 'boolean')
	)
		return { id: object.id, name: object.name, animated: object.animated }

	for (const key of Object.keys(object)) {
		if (SkippedKeys.has(key) || key.startsWith('_')) continue
		const found = scan(object[key], depth + 1)
		if (found) return found
	}
}

export function getEmojiInfo(ref: EmojiRef): EmojiInfo {
	const EmojiStore = Stores.EmojiStore as
		| DiscordModules.Flux.Store<{
				getCustomEmojiById?(id: string): CustomEmoji | undefined
		  }>
		| undefined
	const GuildStore = Stores.GuildStore as
		| DiscordModules.Flux.Store<{
				getGuild?(id: string): Guild | undefined
		  }>
		| undefined

	const known = EmojiStore?.getCustomEmojiById?.(ref.id)
	const animated = known?.animated ?? ref.animated ?? false

	const info: EmojiInfo = {
		id: ref.id,
		name: known?.name ?? ref.name ?? 'emoji',
		animated,
		imageUrl: `${Cdn}/emojis/${ref.id}.${animated ? 'gif' : 'png'}?size=96&quality=lossless`,
	}

	const guild = known?.guildId ? GuildStore?.getGuild?.(known.guildId) : undefined
	if (guild)
		info.guild = {
			id: guild.id,
			name: guild.name,
			iconUrl: guild.icon
				? `${Cdn}/icons/${guild.id}/${guild.icon}.png?size=64`
				: undefined,
			discoverable: guild.features
				? new Set(guild.features).has('DISCOVERABLE')
				: false,
		}

	return info
}
