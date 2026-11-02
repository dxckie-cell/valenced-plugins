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
	animated?: boolean
}

// Custom emoji images are always served from /emojis/<snowflake>.<ext>
const EmojiUrl = /\/emojis\/(\d{15,25})\.(\w+)/
const Snowflake = /^\d{15,25}$/
const MarkupEmoji = /<a?:(\w{2,32}):(\d{15,25})>/g
const SkippedKeys = new Set(['children', 'style', 'ref', 'key'])
const LabelKeys = ['emojiName', 'alt', 'accessibilityLabel', 'title', 'name']

/** Names of emoji seen in bios, since servers you're not in don't give theirs */
const names = new Map<string, string>()

/** Remembers `<:name:id>` markup and emoji objects found anywhere in a bio's props. */
export function rememberNames(
	value: unknown,
	depth = 0,
	seen = new WeakSet<object>(),
) {
	if (value == null || depth > 8) return

	if (typeof value === 'string') {
		for (const match of value.matchAll(MarkupEmoji))
			names.set(match[2]!, match[1]!)
		return
	}

	if (typeof value !== 'object' || seen.has(value)) return
	seen.add(value)

	if (Array.isArray(value)) {
		for (const item of value) rememberNames(item, depth + 1, seen)
		return
	}

	if ('$$typeof' in value) return

	const object = value as Record<string, any>
	const id = object.emojiId ?? object.id
	if (
		typeof id === 'string' &&
		Snowflake.test(id) &&
		typeof object.name === 'string' &&
		/^\w{2,32}$/.test(object.name) &&
		(object.emojiId || object.type === 'customEmoji' || object.type === 'emoji')
	)
		names.set(id, object.name)

	for (const key of Object.keys(object))
		if (!key.startsWith('_')) rememberNames(object[key], depth + 1, seen)
}

function labelOf(props: Record<string, any>): string | undefined {
	for (const key of LabelKeys) {
		const value = props[key]
		if (typeof value !== 'string') continue
		const name = value.replace(/^:|:$/g, '')
		if (/^\w{2,32}$/.test(name)) return name
	}
}

/** Reads the emoji a rendered element stands for, without knowing which component drew it. */
export function emojiFromProps(
	props: Record<string, any> | null | undefined,
): EmojiRef | undefined {
	if (!props) return
	const emoji = scan(props, 0)
	if (emoji && !emoji.name) emoji.name = labelOf(props)
	return emoji
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

/** The emoji's name and whether it's animated, from Discord if it knows the emoji. */
export function resolveEmoji(ref: EmojiRef) {
	const EmojiStore = Stores.EmojiStore as
		| DiscordModules.Flux.Store<{
				getCustomEmojiById?(id: string): CustomEmoji | undefined
		  }>
		| undefined

	const known = EmojiStore?.getCustomEmojiById?.(ref.id)

	return {
		id: ref.id,
		name: known?.name ?? names.get(ref.id) ?? ref.name ?? 'emoji',
		animated: known?.animated ?? ref.animated ?? false,
	}
}
