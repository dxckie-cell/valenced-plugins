import patchMessageSheet from './patches/messageSheet'
import patchPinsTab from './patches/pinsTab'
import { DEFAULTS, setStorage } from './lib/state'
import type { PinStore } from './lib/state'
import Settings from './ui/Settings'

export default plugin<{ jsonStorage: PinStore }>({
	jsonStorage: { load: true, default: DEFAULTS },

	start(api) {
		// Enabling mid-session leaves Discord modules half-patched: ask for a reload instead.
		if (api.plugin.startedLate) {
			api.plugin.requireReload()
			return
		}

		setStorage(api.jsonStorage)
		api.cleanup(() => setStorage(undefined))

		// one failing patch (Discord changed something) must not stop the other
		for (const patch of [patchMessageSheet, patchPinsTab]) {
			try {
				api.cleanup(patch())
			} catch (e) {
				api.plugin.reportError(e)
			}
		}
	},

	// Unpatching can't undo what Discord already rendered with our hooks.
	stop(api) {
		api.plugin.requireReload()
	},

	SettingsComponent: Settings,
})
