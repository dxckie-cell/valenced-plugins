import { instead } from '@valenced/patcher'
import { withModule } from '../lib/modules'
import type { JsonStorage } from '@valenced/json-storage'
import type { Storage } from '../lib/storage'

/** Adds "Override Icon" to the menu that opens when you long-press a server in the server bar. */
export function patchMenu(storage: JsonStorage<Storage>, openSettings: () => void): () => void {
	let unpatch: (() => void) | undefined
	const g = globalThis as any
	const lookupIcon = (g.valenced ?? g.revenge)?.utils?.discord?.lookupGeneratedIconComponent
	const icon = lookupIcon?.('ImageIcon')

	// The server bar builds its long-press menu in a gesture handler and passes it to showContextMenu, so add the row there.
	const cancel = withModule(
		'design/components/ContextMenu/native/ContextMenuState.native.tsx',
		(m: any) => typeof m?.showContextMenu === 'function',
		(_, exports) => {
			unpatch = instead(exports, 'showContextMenu', (args: any[], original: any) => {
				const menu = args[0]
				const id = menu?.key
				// push, not replace: Discord picks the tapped row from its own copy of this same array.
				// Servers have a numeric ID as key; folders have none.
				if (Array.isArray(menu?.items) && typeof id === 'string' && /^\d{5,}$/.test(id)) {
					menu.items.push(
						{
							// Discord's own icon component, like the other rows, so the size and spacing match.
							IconComponent: icon,
							label: 'Override Icon',
							async action() {
								const overrides = storage.cache?.overrides ?? []
								// The server's ID goes first in the list, so it is the first thing in settings.
								if (!overrides.some(o => o.id === id)) {
									await storage.set({ overrides: [{ id, icon: '', banner: '' }, ...overrides] })
								}
								// Wait until the menu has closed, or the settings page can open underneath it.
								setTimeout(openSettings, 300)
							},
						},
					)
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
