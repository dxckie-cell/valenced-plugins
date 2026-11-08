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
		api.cleanup(patchMenu(api.jsonStorage, () => {
			// The plugin settings page opens inside Discord's settings screen, so open that first when coming from a server.
			const found: any = lookupModule(withProps<any>('openUserSettings'))?.[0]
			const open = (found?.default ?? found)?.openUserSettings
			const notes = [`openUserSettings: ${typeof open}`, `pluginSettings: ${typeof (api as any).pluginSettings}`]
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
