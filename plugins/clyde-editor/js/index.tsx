import { applyPatches } from './patches'
import { SettingsComponent } from './settings'
import { DEFAULT_SETTINGS, type Settings, setStorage } from './state'

export default plugin<{ jsonStorage: Settings }>({
	// The name, avatar and banner are stored in the plugin's own JSON storage.
	jsonStorage: { default: DEFAULT_SETTINGS, load: true },

	SettingsComponent,

	start({ jsonStorage, cleanup, unscoped }) {
		setStorage(jsonStorage)
		cleanup(() => setStorage(undefined))

		// Reads the settings from disk if they are not in memory yet.
		jsonStorage.get().catch(e => console.log('[clyde-editor] could not read settings', e))

		applyPatches(unscoped.discord.flux.getStore, cleanup)
	},
})
