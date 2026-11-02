import {
	ActionSheetActionCreators,
	ToastActionCreators,
} from '@valenced/discord/actions'
import {
	getModuleWithImportedPath,
	lookupModuleWithImportedPath,
} from '@valenced/discord/utils/modules/finders'
import { getModules } from '@valenced/modules/finders'
import { withName } from '@valenced/modules/finders/filters'
import * as metro from '@valenced/modules/metro'
import { resolveEmoji } from './emoji'
import type { ComponentType } from 'react'
import type { EmojiRef } from './emoji'

type EmojiSheet = ComponentType<{
	emojiNode: { id: string; alt: string; src: string; animated?: boolean }
}>

/** Where the sheet's module id is remembered between app starts */
interface SheetStorage {
	getId(): number | undefined
	setId(id: number | null): void
}

const Path = 'modules/messages/native/emoji/MessageEmojiActionSheet.tsx'
const SheetKey = 'dxckie.bio-emoji-context'

let Sheet: EmojiSheet | undefined
let storage: SheetStorage | undefined

function found(sheet: EmojiSheet, id: number) {
	if (!sheet) return
	Sheet = sheet
	if (storage?.getId() !== id) storage?.setId(id)
}

/**
 * Discord's own emoji sheet, the one tapping an emoji in chat opens.
 * Plugins that add to it, like Expression Utils, show up here too.
 */
export function findEmojiSheet(sheetStorage: SheetStorage) {
	storage = sheetStorage

	const unsubscribes = [
		getModuleWithImportedPath<{ default: EmojiSheet }>(Path, (module, id) =>
			found(module.default, id),
		),
		// In case the path changes
		getModules(withName<EmojiSheet>('MessageEmojiActionSheet'), found),
	]

	return () => {
		for (const unsubscribe of unsubscribes) unsubscribe()
		Sheet = undefined
		storage = undefined
	}
}

function lookup() {
	const result = lookupModuleWithImportedPath<{ default: EmojiSheet }>(Path)
	if (result.length === 2 && result[0]?.default)
		found(result[0].default, result[1])
}

/** Discord only loads the sheet once an emoji is tapped in chat, so later app starts load it by its remembered id. */
function load() {
	if (Sheet) return true

	lookup()
	const id = storage?.getId()
	if (Sheet || id === undefined) return !!Sheet

	if (!metro.isModuleInitialized(id)) {
		try {
			__r(id)
		} catch {}
	}

	lookup()
	// Discord updated and its modules moved, so the id is learned again from chat
	if (!Sheet) storage?.setId(null)

	return !!Sheet
}

export function openEmojiSheet(ref: EmojiRef) {
	if (!load()) {
		ToastActionCreators.open(SheetKey, {
			text: 'Open an emoji in chat once, then try again.',
		})
		return
	}

	const { id, name, animated } = resolveEmoji(ref)

	ActionSheetActionCreators.openLazy(
		Promise.resolve({ default: Sheet! }),
		SheetKey,
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
}
