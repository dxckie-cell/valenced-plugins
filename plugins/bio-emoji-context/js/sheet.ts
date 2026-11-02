import { ActionSheetActionCreators } from '@valenced/discord/actions'
import { getModuleWithImportedPath } from '@valenced/discord/utils/modules/finders'
import { resolveEmoji } from './emoji'
import type { ComponentType } from 'react'
import type { EmojiRef } from './emoji'

interface EmojiSheetProps {
	emojiNode: {
		id: string
		alt: string
		src: string
		animated?: boolean
	}
}

let EmojiSheet: ComponentType<EmojiSheetProps> | undefined

/**
 * Discord's own emoji sheet, the one tapping an emoji in chat opens.
 * Plugins that add to it, like Expression Utils, show up here too.
 */
export function findEmojiSheet() {
	return getModuleWithImportedPath<{ default: ComponentType<EmojiSheetProps> }>(
		'modules/messages/native/emoji/MessageEmojiActionSheet.tsx',
		module => {
			EmojiSheet = module.default
		},
	)
}

/** Returns false when Discord's sheet wasn't found. */
export function openEmojiSheet(ref: EmojiRef) {
	if (!EmojiSheet) return false

	const { id, name, animated } = resolveEmoji(ref)

	ActionSheetActionCreators.openLazy(
		Promise.resolve({ default: EmojiSheet }),
		'dxckie.bio-emoji-context',
		{
			emojiNode: {
				id,
				alt: name,
				src: `https://cdn.discordapp.com/emojis/${id}.${animated ? 'gif' : 'webp'}?size=128`,
				animated,
			},
		},
		// Keeps the profile open underneath instead of replacing it
		'stack',
	)

	return true
}
