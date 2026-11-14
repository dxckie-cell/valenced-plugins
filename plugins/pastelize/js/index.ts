// Pastelize for Valenced: gives names without a role color a pastel color picked from the user ID.
// Port of Cynosphere's Vendetta plugin, using the fixed copy from EKSIF/EKSIF-Vendetta.

import { getModules } from '@valenced/modules/finders'
import { withName } from '@valenced/modules/finders/filters'
import { instead } from '@valenced/patcher'
import { patchMemberList } from './memberList'
import { pastelizeRow } from './messages'
import { SettingsComponent } from './settings'
import { DEFAULT_SETTINGS, type Settings, setStorage } from './state'

export default plugin<{ jsonStorage: Settings }>({
	jsonStorage: { default: DEFAULT_SETTINGS, load: true },

	SettingsComponent,

	start(api) {
		setStorage(api.jsonStorage)
		api.cleanup(() => setStorage(undefined))
		api.jsonStorage.get().catch(e => api.plugin.reportError(e))

		patchMemberList(api.cleanup, e => api.plugin.reportError(e))

		// Patched once Discord loads the row renderer, as Discord builds every chat row with it.
		api.cleanup(
			getModules(withName<any>('RowManager'), exports => {
				const Rows = typeof exports === 'function' ? exports : exports?.default
				if (typeof Rows?.prototype?.generate !== 'function') return
				try {
					api.cleanup(
						instead(Rows.prototype, 'generate', function (this: unknown, args: any[], original: any) {
							const result = original.apply(this, args)
							try {
								pastelizeRow(args[0], result)
							} catch (e) {
								api.plugin.reportError(e)
							}
							return result
						}),
					)
				} catch (e) {
					api.plugin.reportError(e)
				}
			}),
		)
	},

	// Unpatching can't undo what Discord already rendered with our colors.
	stop(api) {
		api.plugin.requireReload()
	},
})
