import { applyPatches } from './patches'
import { SettingsComponent } from './settings'
import {
	DEFAULT_SETTINGS,
	notifyChange,
	resetStatus,
	type Settings,
	setStorage,
	status,
} from './state'

export default plugin<{ jsonStorage: Settings }>({
	// Which badges are added and which are hidden are stored in the plugin's own JSON storage.
	jsonStorage: { default: DEFAULT_SETTINGS, load: true },

	SettingsComponent,

	start(api) {
		// Enabling mid-session leaves the profile half-patched: ask for a reload instead.
		if (api.plugin.startedLate) {
			api.plugin.requireReload()
			return
		}

		resetStatus()
		status('loaded', 'loaded')

		const { cleanup, jsonStorage, unscoped } = api

		setStorage(jsonStorage)
		cleanup(() => setStorage(undefined))

		// Reads the settings from disk if they are not in memory yet, then redraws.
		jsonStorage
			.get()
			.then(() => notifyChange())
			.catch(e => api.plugin.reportError(e))

		// A changed setting redraws the profile and the badge list straight away.
		cleanup(jsonStorage.subscribe(() => notifyChange()))

		try {
			applyPatches(unscoped.discord.flux.getStore, cleanup)
		} catch (e) {
			api.plugin.reportError(e)
		}
	},

	// Unpatching can't undo what Discord already rendered with our badges.
	stop(api) {
		api.plugin.requireReload()
	},
})
