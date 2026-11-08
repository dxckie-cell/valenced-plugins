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
		api.cleanup(patchMenu(api.jsonStorage, () => (api as any).pluginSettings.openPluginSettings('dxckie.override-server-appearance')))
	},

	SettingsComponent: Settings,
})
