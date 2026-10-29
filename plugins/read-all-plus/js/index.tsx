import patchGuildBar from './guildBar'
import { SettingsComponent } from './settings'
import { DEFAULT_SETTINGS, type Settings, setStorage } from './state'

export default plugin<{ jsonStorage: Settings }>({
	// The excluded server and DM IDs are stored in the plugin's own JSON storage.
	jsonStorage: { default: DEFAULT_SETTINGS, load: true },

	SettingsComponent,

	start(api) {
		// Enabling mid-session leaves the guild bar half-patched: ask for a reload instead.
		if (api.plugin.startedLate) {
			api.plugin.requireReload()
			return
		}

		setStorage(api.jsonStorage)
		api.cleanup(() => setStorage(undefined))

		// Reads the excluded IDs from disk if they are not in memory yet.
		api.jsonStorage.get().catch(e => api.plugin.reportError(e))

		try {
			api.cleanup(patchGuildBar())
		} catch (e) {
			api.plugin.reportError(e)
		}
	},

	// Unpatching can't undo what Discord already rendered with our footer.
	stop(api) {
		api.plugin.requireReload()
	},
})
