import { DEFAULTS, type Storage } from './lib/storage'
import Settings from './ui/Settings'

// Nothing runs at startup: Apply in settings writes the background override, which Valenced keeps on its own.
export default plugin<{ jsonStorage: Storage }>({
	jsonStorage: {
		load: true,
		default: DEFAULTS,
	},

	SettingsComponent: Settings,
})
