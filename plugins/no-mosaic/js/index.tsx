import Page from '@valenced/components/Page'
import { Design } from '@valenced/discord/design'
import { before } from '@valenced/patcher'
import { useState } from 'react'
import { ScrollView } from 'react-native'

// The grid is drawn natively from the rows that updateRows serializes, and a one-image grid is drawn
// as a plain full-width image. So a message with N images is sent as N rows with one image each.
// Experimental: both switches reset on restart and default to on (the list runs bottom-up on Android).
const state = { split: true, reversed: true, realIds: true, rows: 0, error: '' }

type Row = { message?: any; index?: number; separatorBefore?: boolean; renderContentOnly?: boolean }

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
			// Content-only rows are how the list draws a follow-up message without the name header.
			renderContentOnly: true,
			message: {
				...row.message,
				// Fake ids keep rows unique but make the native menus fail; real ids may collide in the list.
				id: realIds ? row.message.id : `${row.message.id}-${i + 1}`,
				attachments: [item],
				isFirst: false,
				renderContentOnly: true,
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

const SettingsComponent = () => {
	const [, refresh] = useState(0)
	const flip = (key: 'split' | 'reversed' | 'realIds') => {
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
		cleanup(
			before(JSON, 'stringify', (args: any[]) => {
				try {
					const a = args[0]
					// Any array holding a grouped message row; batches can start with date separators, so check every item.
					if (!state.split || !Array.isArray(a) || a.length > 500 || !a.some(r => r?.message?.attachments?.length > 1)) return args
					return [splitRows(a, state.reversed, state.realIds), ...args.slice(1)]
				} catch (e) {
					state.error = String(e)
					return args
				}
			}),
		)
	},
})
