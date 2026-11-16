import Page from '@valenced/components/Page'
import { Design } from '@valenced/discord/design'
import { Clipboard } from '@valenced/externals/react-native-clipboard'
import { after } from '@valenced/patcher'
import { useState } from 'react'
import { ScrollView } from 'react-native'

import { disableGrid } from './grid'

// Shown on the settings page so a missing patch is visible on the phone.
const status = { patched: 0, rows: 0, changed: 0, error: '', sample: '' }

// Short, depth-limited dump of one message so we can see why the stacked layout renders nothing.
const brief = (v: any, depth = 0): string => {
	if (v === null || typeof v !== 'object') return typeof v === 'function' ? 'fn' : JSON.stringify(v)?.slice(0, 60) ?? String(v)
	if (depth >= 2) return Array.isArray(v) ? `[${v.length}]` : '{…}'
	const entries = Array.isArray(v) ? v.slice(0, 2) : Object.keys(v).slice(0, 25).map(k => v[k])
	const keys = Array.isArray(v) ? entries.map((_, i) => i) : Object.keys(v).slice(0, 25)
	return `${Array.isArray(v) ? `[${v.length}]` : ''}{${keys.map((k, i) => `${k}:${brief(entries[i], depth + 1)}`).join(', ')}}`
}

const SettingsComponent = () => {
	const [, refresh] = useState(0)
	return (
		<ScrollView>
			<Page>
				<Design.TableRowGroup title="Status">
					<Design.TableRow label={`Message builder patched: ${status.patched}`} />
					<Design.TableRow label={`Messages seen: ${status.rows}, changed: ${status.changed}`} />
					<Design.TableRow label="Copy sample" onPress={() => Clipboard.setString(status.sample)} />
					<Design.TableRow label={status.sample || 'No sample yet'} />
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
						if (had === true) {
							status.changed++
							if (!status.sample && content.attachments?.length > 1) {
								try {
									status.sample = `grid=${had} attachments=${brief(content.attachments)} opacity=${brief(content.attachmentsOpacity)} keys=${Object.keys(content).filter(k => /attach|media|grid|layout|image|video/i.test(k)).join(',')}`
								} catch {}
							}
						}
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
