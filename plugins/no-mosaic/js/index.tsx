import Page from '@valenced/components/Page'
import { Design } from '@valenced/discord/design'
import { after } from '@valenced/patcher'
import { useState } from 'react'
import { ScrollView } from 'react-native'

import { disableGrid } from './grid'

// Shown on the settings page so a missing patch is visible on the phone.
const status = { patched: 0, rows: 0, changed: 0, error: '' }

const SettingsComponent = () => {
	const [, refresh] = useState(0)
	return (
		<ScrollView>
			<Page>
				<Design.TableRowGroup title="Status">
					<Design.TableRow label={`Message builder patched: ${status.patched}`} />
					<Design.TableRow label={`Messages seen: ${status.rows}, changed: ${status.changed}`} />
					{status.error ? <Design.TableRow label={`Error: ${status.error}`} /> : null}
					<Design.TableRow label="Refresh" onPress={() => refresh(n => n + 1)} />
				</Design.TableRowGroup>
			</Page>
		</ScrollView>
	)
}

export default plugin({
	SettingsComponent,

	start({ cleanup, plugin }) {
		const metro = valenced.modules.metro as any
		const seen = new WeakSet<object>()

		// Scan initialized modules directly: the same lookup the diagnostic used successfully.
		const check = (exports: any) => {
			try {
				if (!exports || typeof exports !== 'object' || seen.has(exports)) return
				if (exports.default?.name !== 'createMessageContent') return
				seen.add(exports)
				status.patched++
				cleanup(
					after(exports, 'default', (content: any) => {
						status.rows++
						const had = content?.useAttachmentGridLayout
						const out = disableGrid(content)
						if (had === true) status.changed++
						return out
					}),
				)
			} catch (e) {
				status.error = String(e)
				plugin.reportError(e)
			}
		}

		const walk = () => {
			for (let id = 0; id < 40000; id++) {
				try {
					if (metro.isModuleInitialized(id)) check(metro.getInitializedModuleExports(id))
				} catch {}
			}
		}

		walk()
		const stop = metro.onAnyModuleInitialized((_id: any, exports: any) => check(exports))
		if (typeof stop === 'function') cleanup(stop)
		// The message code may load after start.
		let passes = 0
		const timer = setInterval(() => (++passes > 10 ? clearInterval(timer) : walk()), 3000)
		cleanup(() => clearInterval(timer))
	},
})
