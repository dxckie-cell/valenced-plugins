import TableRowAssetIcon from '@valenced/components/TableRowAssetIcon'
import { instead } from '@valenced/patcher'
import { createElement } from 'react'
import { withModule } from '../lib/modules'
import type { JsonStorage } from '@valenced/json-storage'
import type { Storage } from '../lib/storage'

/** Adds "Override Icon" to the menu that opens when you long-press a server in the server bar. */
export function patchMenu(storage: JsonStorage<Storage>, openSettings: () => void): () => void {
	let unpatch: (() => void) | undefined

	// The server bar builds its long-press menu in a gesture handler and passes it to showContextMenu, so add the row there.
	const cancel = withModule(
		'design/components/ContextMenu/native/ContextMenuState.native.tsx',
		(m: any) => typeof m?.showContextMenu === 'function' || typeof m === 'object',
		(_, exports) => {
			unpatch = instead(exports, 'showContextMenu', (args: any[], original: any) => {
				const menu = args[0]
				const id = menu?.key
				// Servers have a numeric ID as key; folders have none.
				if (Array.isArray(menu?.items) && typeof id === 'string' && /^\d{5,}$/.test(id)) {
					menu.items = [
						...menu.items,
						{
							IconComponent: () => createElement(TableRowAssetIcon, { name: 'ImageIcon' }),
							label: 'Override Icon',
							async action() {
								const overrides = storage.cache?.overrides ?? []
								// The server's ID goes first in the list, so it is the first thing in settings.
								if (!overrides.some(o => o.id === id)) {
									await storage.set({ overrides: [{ id, icon: '', banner: '' }, ...overrides] })
								}
								openSettings()
							},
						},
					]
				}
				return original(...args)
			})
		},
	)

	return () => {
		cancel()
		unpatch?.()
	}
}
