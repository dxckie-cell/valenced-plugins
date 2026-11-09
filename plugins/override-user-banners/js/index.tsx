import { lookupModule } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import { patchMenu } from './menu'
import { applyPatches } from './patches'
import { SettingsComponent } from './settings'
import { DEFAULT_SETTINGS, resetStatus, type Settings, setStorage, status } from './state'

export default plugin<{ jsonStorage: Settings }>({
	// The overrides are stored in the plugin's own JSON storage.
	jsonStorage: { default: DEFAULT_SETTINGS, load: true },

	SettingsComponent,

	start(api) {
		const { jsonStorage, cleanup, unscoped } = api
		resetStatus()
		status('loaded', `loaded v${unscoped.plugins.utils.formatVersion(this.manifest.version)}`)

		setStorage(jsonStorage)
		cleanup(() => setStorage(undefined))

		// Reads the overrides from disk if they are not in memory yet.
		jsonStorage
			.get()
			.catch(e => status('settings', `could not read settings: ${(e as Error)?.message}`))

		applyPatches(unscoped.discord.flux.getStore, cleanup)

		cleanup(
			patchMenu(jsonStorage, () => {
				// The plugin's page opens inside Discord's settings screens, so open those first.
				const root: any = lookupModule(withProps<any>('getRootNavigationRef'))?.[0]
				;(root?.default ?? root)?.getRootNavigationRef?.()?.navigate('settings', 'OVERVIEW', { pop: true })
				setTimeout(() => (api as any).pluginSettings.openPluginSettings('dxckie.override-user-banners'), 50)
			}),
		)
	},
})
