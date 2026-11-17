import Page from '@valenced/components/Page'
import { Design } from '@valenced/discord/design'
import { Clipboard } from '@valenced/externals/react-native-clipboard'
import { before } from '@valenced/patcher'
import { useState } from 'react'
import { ScrollView } from 'react-native'

// The grid is drawn natively from the rows that updateRows serializes, and a one-image grid is drawn
// as a plain full-width image. So a message with N images is sent as N rows with one image each.
// Experimental: both switches reset on restart and default to on (the list runs bottom-up on Android).
const state = { split: true, reversed: true, realIds: true, rows: 0, error: '', record: false, hooked: 0, log: [] as string[] }

type Row = { message?: any; index?: number; separatorBefore?: boolean }

export function splitRows(rows: Row[], reversed: boolean, realIds = false): Row[] {
	const out: Row[] = []
	for (const row of rows) {
		const list = row?.message?.attachments
		if (!Array.isArray(list) || list.length < 2) {
			out.push(row)
			continue
		}
		state.rows++
		const head = { ...row, message: { ...row.message, attachments: [list[0]] } }
		const rest = list.slice(1).map((item: any, i: number) => ({
			...row,
			separatorBefore: false,
			message: {
				...row.message,
				// Fake ids keep rows unique but make the native menus fail; real ids may collide in the list.
				id: realIds ? row.message.id : `${row.message.id}-${i + 1}`,
				attachments: [item],
				// What a follow-up message from the same author carries, so the list draws no name header.
				isFirst: false,
				avatarURL: undefined,
				avatarDecorationURL: null,
				timestamp: undefined,
				timestampTooltip: undefined,
				timestampColor: undefined,
				timestampAccessibilityLabel: undefined,
				content: undefined,
				reactions: [],
				embeds: [],
				codedLinks: [],
				stickers: [],
			},
		}))
		// Index 0 is assumed to be the top of the list; "reversed" flips that for an upside-down list.
		out.push(...(reversed ? [...rest.reverse(), head] : [head, ...rest]))
	}
	// The native list also reads each row's position.
	return out.map((r, i) => (r && 'index' in r && r.index !== i ? { ...r, index: i } : r))
}

// Temporary: finds the function that opens the image viewer so the tapped image can be passed on.
const VIEWER = /(open|show|launch|present|press).*(media|image|lightbox|attachment|viewer|gallery)|(media|image|lightbox|attachment).*(viewer|lightbox|gallery)/i

const brief = (v: any, depth = 0): string => {
	if (v === null || typeof v !== 'object') return typeof v === 'function' ? 'fn' : String(v).slice(0, 40)
	if (depth >= 2) return Array.isArray(v) ? `[${v.length}]` : '{…}'
	return `${Array.isArray(v) ? `[${v.length}]` : ''}{${Object.keys(v).slice(0, 25).map(k => `${k}:${brief(v[k], depth + 1)}`).join(', ')}}`
}

const SettingsComponent = () => {
	const [, refresh] = useState(0)
	const flip = (key: 'split' | 'reversed' | 'realIds' | 'record') => {
		state[key] = !state[key]
		refresh(n => n + 1)
	}
	return (
		<ScrollView>
			<Page>
				<Design.TableRowGroup title="Experimental">
					<Design.TableRow label={`Split grouped images into rows: ${state.split ? 'ON' : 'OFF'}`} onPress={() => flip('split')} />
					<Design.TableRow label={`Reverse order: ${state.reversed ? 'ON' : 'OFF'}`} onPress={() => flip('reversed')} />
					<Design.TableRow label={`Real message ids on extra rows (so press and hold works): ${state.realIds ? 'ON' : 'OFF'}`} onPress={() => flip('realIds')} />
					<Design.TableRow label={`Record taps: ${state.record ? 'ON' : 'OFF'} (hooked ${state.hooked})`} onPress={() => flip('record')} />
					<Design.TableRow label="Copy tap log" onPress={() => Clipboard.setString(state.log.join('\n'))} />
					<Design.TableRow label={state.log.join(' || ') || 'No taps recorded'} />
					<Design.TableRow label={`Messages split: ${state.rows}`} />
					{state.error ? <Design.TableRow label={`Error: ${state.error}`} /> : null}
					<Design.TableRow label="Reopen the chat after changing a switch" />
				</Design.TableRowGroup>
			</Page>
		</ScrollView>
	)
}

export default plugin({
	SettingsComponent,

	start({ cleanup }) {
		const metro = valenced.modules.metro as any
		const done = new Set<string>()
		const hook = (id: any, exports: any) => {
			try {
				if (!exports || typeof exports !== 'object') return
				for (const key of Object.keys(exports).slice(0, 80)) {
					const fn = exports[key]
					const name = typeof fn === 'function' ? fn.name || key : ''
					if (!name || !VIEWER.test(name) || state.hooked >= 150 || done.has(`${id}:${key}`)) continue
					done.add(`${id}:${key}`)
					state.hooked++
					cleanup(
						before(exports, key, (args: any[]) => {
							try {
								if (state.record && state.log.length < 15) {
									const frames = (new Error().stack ?? '').split('\n').slice(2, 6).map(f => f.trim().replace(/(\(|^)[^()\s]*[\\/]/, '$1').replace(/^at /, ''))
									state.log.push(`${name}#${id}(${args.slice(0, 4).map(a => brief(a)).join(' ; ')}) < ${frames.join(' < ')}`)
								}
							} catch {}
							return args
						}),
					)
				}
			} catch {}
		}
		const walk = () => {
			for (let id = 0; id < 40000; id++) {
				try {
					if (metro.isModuleInitialized(id)) hook(id, metro.getInitializedModuleExports(id))
				} catch {}
			}
		}
		try {
			walk()
			const stop = metro.onAnyModuleInitialized((id: any, exports: any) => hook(id, exports))
			if (typeof stop === 'function') cleanup(stop)
			let passes = 0
			const timer = setInterval(() => (++passes > 10 ? clearInterval(timer) : walk()), 3000)
			cleanup(() => clearInterval(timer))
		} catch (e) {
			state.error = String(e)
		}
		cleanup(
			before(JSON, 'stringify', (args: any[]) => {
				try {
					const a = args[0]
					// Any array holding a grouped message row; batches can start with date separators, so check every item.
					if (!Array.isArray(a) || a.length > 500) return args
					if (!state.split || !a.some(r => r?.message?.attachments?.length > 1)) return args
					return [splitRows(a, state.reversed, state.realIds), ...args.slice(1)]
				} catch (e) {
					state.error = String(e)
					return args
				}
			}),
		)
	},
})
