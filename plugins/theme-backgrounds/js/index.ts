import { hasCustomBackground } from './lib/native'
import { DEFAULTS, type Storage } from './lib/storage'
import { patchAlignment } from './patches/align'
import Settings from './ui/Settings'

// Apply in settings writes the background override, which Valenced keeps on its own.
// The patch only fixes where that image sits in each layer, so it is skipped when no override is set.
export default plugin<{ jsonStorage: Storage }>({
	jsonStorage: {
		load: true,
		default: DEFAULTS,
	},

	start(api) {
		if (hasCustomBackground()) patchAlignment(api.cleanup)
	},

	SettingsComponent: Settings,
})
