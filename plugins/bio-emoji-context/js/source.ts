import { lookupModule } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'

export interface EmojiSource {
	name: string
	iconUrl?: string
	discoverable: boolean
}

interface HTTP {
	get(options: {
		url: string
		oldFormErrors?: boolean
	}): Promise<{ body: SourceBody }>
}

// Shape isn't documented, so every field is read defensively
interface SourceBody {
	name?: string
	icon?: string | null
	guild_id?: string
	features?: string[]
	guild?: {
		id?: string
		name?: string
		icon?: string | null
		features?: string[]
	}
}

const cache = new Map<string, EmojiSource | null>()

/** The server an emoji is from, when Discord says (public servers). Never throws. */
export async function lookupEmojiSource(
	id: string,
): Promise<EmojiSource | undefined> {
	if (cache.has(id)) return cache.get(id) ?? undefined

	try {
		const [exports] = lookupModule(withProps<{ HTTP: HTTP }>('HTTP'))
		if (!exports) return

		const { body } = await exports.HTTP.get({
			url: `/emojis/${id}/source`,
			oldFormErrors: true,
		})

		const guild = body.guild ?? body
		const guildId = body.guild?.id ?? body.guild_id
		const name = guild.name
		if (!name) throw new Error('no server name')

		const source: EmojiSource = {
			name,
			iconUrl:
				guild.icon && guildId
					? `https://cdn.discordapp.com/icons/${guildId}/${guild.icon}.png?size=64`
					: undefined,
			discoverable: !!guild.features?.includes('DISCOVERABLE'),
		}
		cache.set(id, source)
		return source
	} catch {
		// Private server or the lookup isn't allowed, so it isn't asked again
		cache.set(id, null)
	}
}
