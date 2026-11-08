import { Alert } from 'react-native'
import { lookupModule } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import { patchAppearance } from './patches/appearance'
import { patchMenu } from './patches/menu'
import { DEFAULTS, type Storage } from './lib/storage'
import Settings from './ui/Settings'

export default plugin<{ jsonStorage: Storage }>({
	jsonStorage: {
		load: true,
		default: DEFAULTS,
	},

	async start(api) {
		// The saved overrides load asynchronously, so wait for them before Discord draws any server.
		await api.jsonStorage.get().catch(() => {})
		api.cleanup(patchAppearance(api.jsonStorage))
		const notesEarly: string[] = []
		api.cleanup(patchMenu(api.jsonStorage, () => {
			// The plugin settings page opens inside Discord's settings screen, so open that first when coming from a server.
			// Discord only loads this module once settings are opened, so it has to be loaded here.
			let open: any
			try {
				const found: any = lookupModule(withProps<any>('openUserSettings'), { initialize: true } as any)?.[0]
				open = (found?.default ?? found)?.openUserSettings
			} catch (e: any) {
				notesEarly.push(`lookup threw: ${e?.message}`)
			}
			// shortcut: module ID 7490 is only right for this Discord build; remove once the lookup above works
			if (typeof open !== 'function') {
				try {
					open = (globalThis as any).__r?.(7490)?.openUserSettings
					notesEarly.push('used module 7490')
				} catch (e: any) {
					notesEarly.push(`__r threw: ${e?.message}`)
				}
			}
			const notes = [...notesEarly, `openUserSettings: ${typeof open}`, `pluginSettings: ${typeof (api as any).pluginSettings}`]
			try {
				open?.()
			} catch (e: any) {
				notes.push(`openUserSettings threw: ${e?.message}`)
			}
			setTimeout(() => {
				try {
					;(api as any).pluginSettings.openPluginSettings('dxckie.override-server-appearance')
				} catch (e: any) {
					notes.push(`openPluginSettings threw: ${e?.message}`)
				}
				// shortcut: temporary diagnostics, remove once the row opens settings
				Alert.alert('Override Icon debug', notes.join('\n'))
			}, 400)
		}))
	},

	SettingsComponent: Settings,
})
