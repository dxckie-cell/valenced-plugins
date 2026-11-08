import TableRowAssetIcon from '@valenced/components/TableRowAssetIcon'
import { instead } from '@valenced/patcher'
import { createElement } from 'react'
import { withModule } from '../lib/modules'
import type { JsonStorage } from '@valenced/json-storage'
import type { Storage } from '../lib/storage'

/** Adds "Override Icon" to the menu that opens when you long-press a server in the server bar. */
export function patchMenu(storage: JsonStorage<Storage>, openSettings: () => void): () => void {
	let unpatch: (() => void) | undefined

	const cancel = withModule(
		'modules/guilds_bar/native/utils/getGuildsBarGuildMenuItems.tsx',
		(fn: any) => typeof fn === 'function',
		(_, exports) => {
			unpatch = instead(exports, 'default', (args: any[], original: any) => {
				const items = original(...args)
				const id = args[0]
				if (!Array.isArray(items) || typeof id !== 'string') return items

				return [
					...items,
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
			})
		},
	)

	return () => {
		cancel()
		unpatch?.()
	}
}
