import Page from '@valenced/components/Page'
import { Design } from '@valenced/discord/design'
import { Clipboard } from '@valenced/externals/react-native-clipboard'
import { after, before } from '@valenced/patcher'
import { React, ReactJSXRuntime } from '@valenced/react'
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

// Temporary: shows what a tap on an image carries, so the viewer can open on the tapped image.
const brief = (v: any, depth = 0, max = 2): string => {
	if (v === null || typeof v !== 'object') return typeof v === 'function' ? 'fn' : String(v).slice(0, 40)
	if (depth >= max) return Array.isArray(v) ? `[${v.length}]` : '{…}'
	return `${Array.isArray(v) ? `[${v.length}]` : ''}{${Object.keys(v).slice(0, 25).map(k => `${k}:${brief(v[k], depth + 1, max)}`).join(', ')}}`
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
					<Design.TableRow label={`Record taps: ${state.record ? 'ON' : 'OFF'} (wrapped ${state.hooked})`} onPress={() => flip('record')} />
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
		// The native list reports a tapped image to a JS handler; wrap it to see what the tap carries.
		const wrapped = new WeakMap<Function, Function>()
		const probe = (parent: any, key: string) => {
			try {
				cleanup(
					after(parent, key, (el: any) => {
						try {
							const props = el?.props
							if (!props || typeof el.type === 'string') return el
							for (const k of Object.keys(props).slice(0, 40)) {
								const fn = props[k]
								if (typeof fn !== 'function' || !/TapImage|PressImage|TapAttachment/i.test(fn.name)) continue
								let wrapper = wrapped.get(fn)
								if (!wrapper) {
									wrapper = function (this: any, ...args: any[]) {
										try {
											if (state.record && state.log.length < 10) state.log.push(`${fn.name} prop=${k} args=${args.map(x => brief(x, 0, 4)).join(' ; ')}`)
										} catch {}
										return fn.apply(this, args)
									}
									wrapped.set(fn, wrapper)
								}
								props[k] = wrapper
								state.hooked++
							}
						} catch {}
						return el
					}),
				)
			} catch (e) {
				state.error = String(e)
			}
		}
		probe(ReactJSXRuntime, 'jsx')
		probe(ReactJSXRuntime, 'jsxs')
		probe(React, 'createElement')

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
