import { lookupModule } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
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
		api.cleanup(patchMenu(api.jsonStorage, () => {
			// Same call Discord's own openUserSettings makes: navigate to its settings screens.
			const root: any = lookupModule(withProps<any>('getRootNavigationRef'))?.[0]
			;(root?.default ?? root)?.getRootNavigationRef?.()?.navigate('settings', 'OVERVIEW', { pop: true })
			setTimeout(() => (api as any).pluginSettings.openPluginSettings('dxckie.override-server-appearance'), 400)
		}))
	},

	SettingsComponent: Settings,
})
