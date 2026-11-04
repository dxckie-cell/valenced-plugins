import { refreshUsers, startIdentity } from './identity'
import { applyPatches } from './patches'
import { addProfileRows } from './shortcut'
import { SettingsComponent } from './settings'
import {
	DEFAULT_SETTINGS,
	notifyChange,
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
		cleanup(
			jsonStorage.subscribe(() => {
				notifyChange()
				refreshUsers()
			}),
		)

		// Registered before the badge patches, so Nitro's copy of the user is made from the renamed one.
		try {
			startIdentity(cleanup, e => api.plugin.reportError(e))
		} catch (e) {
			api.plugin.reportError(e)
		}

		// The row in Valenced's settings that opens this plugin's settings.
		try {
			const { pluginSettings } = api as any
			cleanup(addProfileRows(() => pluginSettings.openPluginSettings('dxckie.profile-spoof')))
		} catch (e) {
			api.plugin.reportError(e)
		}

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
