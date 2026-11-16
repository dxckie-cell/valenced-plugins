// NoMosaic for Valenced: shows message images and videos one under another instead of in a grid.
// Port of the NoMosaic plugin from Vencord and Equicord. Discord's message builder returns a
// `useAttachmentGridLayout` flag, and this turns it off.

import { getModules } from '@valenced/modules/finders'
import { withName } from '@valenced/modules/finders/filters'
import { after } from '@valenced/patcher'
import { disableGrid } from './grid'

export default plugin({
	start({ cleanup, plugin }) {
		cleanup(
			getModules(withName<any>('createMessageContent'), exports => {
				try {
					if (typeof exports?.default !== 'function') return
					cleanup(after(exports, 'default', disableGrid))
				} catch (e) {
					plugin.reportError(e)
				}
			}),
		)
	},
})
