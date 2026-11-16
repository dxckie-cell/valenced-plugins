import Page from '@valenced/components/Page'
import { Design } from '@valenced/discord/design'
import { Clipboard } from '@valenced/externals/react-native-clipboard'
import { after } from '@valenced/patcher'
import { React, ReactJSXRuntime } from '@valenced/react'
import { useState } from 'react'
import { ScrollView } from 'react-native'


// Shown on the settings page so a missing patch is visible on the phone.
const status = { patched: 0, rows: 0, changed: 0, error: '', sample: '', hits: [] as string[], names: [] as string[], reads: [] as string[] }

// Observe-only for now: URLs of grouped attachments, used to find the component that draws them.
const urls = new Set<string>()

const findUrl = (v: any, path: string, depth: number): string | undefined => {
	if (typeof v === 'string') return v.length > 20 && v.length < 600 && [...urls].some(u => v.includes(u)) ? path : undefined
	if (!v || typeof v !== 'object' || depth > 5 || v.$$typeof) return
	for (const k of Object.keys(v).slice(0, 40)) {
		try {
			const hit = findUrl(v[k], `${path}.${k}`, depth + 1)
			if (hit) return hit
		} catch {}
	}
}

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
					<Design.TableRow label={`Drawn by: ${status.hits.join(' | ') || 'not found yet'}`} />
					<Design.TableRow label={`Read by: ${status.reads.join(' || ') || 'nothing yet'}`} />
					<Design.TableRow label={`Seen: ${status.names.join(' | ') || 'none'}`} />
					<Design.TableRow label="Copy sample" onPress={() => Clipboard.setString(`${status.sample}\nDRAWN ${status.hits.join(' | ')}\nREAD ${status.reads.join('\n')}`)} />
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
						if (had === true) status.changed++
						const list = content?.attachments
						if (list?.length > 1) {
							// Record who reads the grid flag: the stack names the component that decides the layout.
							for (const key of ['useAttachmentGridLayout', 'attachments']) {
								try {
									let value = content[key]
									Object.defineProperty(content, key, {
										configurable: true,
										enumerable: true,
										get() {
											if (status.reads.length < 6) {
												const frames = (new Error().stack ?? '').split('\n').slice(2, 9).map(f => f.trim().replace(/(\(|^)[^()\s]*[\\/]/, '$1').replace(/^at /, ''))
												const line = `${key}: ${frames.join(' < ')}`
												if (!status.reads.some(r => r.slice(0, 160) === line.slice(0, 160))) status.reads.push(line)
											}
											return value
										},
										set(v) {
											value = v
										},
									})
								} catch {}
							}
							try {
								for (const item of list.slice(0, 20)) if (typeof item?.url === 'string') urls.add(item.url.split('?')[0].split('/').slice(-2).join('/'))
								status.sample ||= `grid=${had} n=${list.length} keys=${Object.keys(list[0]).join(',')}`
							} catch {}
						}
						return content
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

		const probe = (parent: any, key: string) => {
			try {
				cleanup(
					after(parent, key, (el: any) => {
						try {
							const n = el?.type?.displayName || el?.type?.name || el?.type?.type?.name || el?.type?.render?.name
							if (n && status.names.length < 0 && /media|attach|grid|mosaic|gallery|image|video/i.test(n)) {
								const label = `${n}(${Object.keys(el.props ?? {}).slice(0, 8).join(',')})`
								if (!status.names.includes(label)) status.names.push(label)
							}
							if (urls.size && status.hits.length < 15 && el?.props) {
								const type = el.type
								const name = type?.displayName || type?.name || type?.type?.name || type?.render?.name
								const at = findUrl(el.props, 'props', 0)
								const label = at && `${name ?? typeof type}${at.slice(5)}`
								if (label && !status.hits.includes(label)) status.hits.push(label)
							}
						} catch {}
						return el
					}),
				)
			} catch (e) {
				status.error = String(e)
			}
		}
		probe(ReactJSXRuntime, 'jsx')
		probe(ReactJSXRuntime, 'jsxs')
		probe(React, 'createElement')

		walk()
		const stop = metro.onAnyModuleInitialized((_id: any, exports: any) => check(exports))
		if (typeof stop === 'function') cleanup(stop)
		// The message code may load after start.
		let passes = 0
		const timer = setInterval(() => (++passes > 10 ? clearInterval(timer) : walk()), 3000)
		cleanup(() => clearInterval(timer))
	},
})
