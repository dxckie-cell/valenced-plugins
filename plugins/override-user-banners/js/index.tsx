import { applyPatches } from './patches'
import { SettingsComponent } from './settings'
import { DEFAULT_SETTINGS, resetStatus, type Settings, setStorage, status } from './state'

export default plugin<{ jsonStorage: Settings }>({
	// The overrides are stored in the plugin's own JSON storage.
	jsonStorage: { default: DEFAULT_SETTINGS, load: true },

	SettingsComponent,

	start({ jsonStorage, cleanup, unscoped }) {
		resetStatus()
		status('loaded', `loaded v${unscoped.plugins.utils.formatVersion(this.manifest.version)}`)

		setStorage(jsonStorage)
		cleanup(() => setStorage(undefined))

		// Reads the overrides from disk if they are not in memory yet.
		jsonStorage
			.get()
			.catch(e => status('settings', `could not read settings: ${(e as Error)?.message}`))

		applyPatches(unscoped.discord.flux.getStore, cleanup)
	},
})
