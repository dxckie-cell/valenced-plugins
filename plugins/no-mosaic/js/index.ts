import { after, before } from '@valenced/patcher'
import { React, ReactJSXRuntime } from '@valenced/react'

// Discord draws the media grid natively from the rows sent to the list, and a one-image grid is drawn
// as a plain full-width image. So a message with N images is sent as N rows with one image each.

type Row = { message?: any; index?: number; separatorBefore?: boolean }

// Image sizes per split message, to find out which image a tap was on.
const sizes = new Map<string, number[][]>()

export function splitRows(rows: Row[]): Row[] {
	const out: Row[] = []
	for (const row of rows) {
		const list = row?.message?.attachments
		if (!Array.isArray(list) || list.length < 2) {
			out.push(row)
			continue
		}
		if (sizes.size > 500) sizes.delete(sizes.keys().next().value!)
		sizes.set(String(row.message.id), list.map((i: any) => [i.width, i.height]))
		const head = { ...row, message: { ...row.message, attachments: [list[0]] } }
		const rest = list.slice(1).map((item: any) => ({
			...row,
			separatorBefore: false,
			message: {
				...row.message,
				// Same id as the real message so press and hold and the viewer find it.
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
		// The chat list runs bottom-up, so the name header (head) goes last.
		out.push(...rest.reverse(), head)
	}
	// The native list also reads each row's position.
	return out.map((r, i) => (r && 'index' in r && r.index !== i ? { ...r, index: i } : r))
}

// The tap event reports the tapped rectangle but only the index inside its own one-image row, so the
// real position is recovered by matching the rectangle's aspect ratio to the message's images.
// shortcut: images with the same aspect ratio can't be told apart (first one wins), fine until the event carries more.
export function pickIndex(sizes: number[][], layout: { width: number; height: number }): number {
	const ratio = layout.width / layout.height
	let best = -1
	let bestDiff = Infinity
	sizes.forEach(([w, h], i) => {
		const diff = Math.abs(Math.log(w / h / ratio))
		if (diff < bestDiff) {
			bestDiff = diff
			best = i
		}
	})
	return best
}

export default plugin({
	start({ cleanup }) {
		// Wrap the chat's image tap handler so the viewer opens on the tapped image.
		const wrapped = new WeakMap<Function, Function>()
		const probe = (parent: any, key: string) =>
			cleanup(
				after(parent, key, (el: any) => {
					try {
						const props = el?.props
						if (!props || typeof el.type === 'string') return el
						for (const k of Object.keys(props).slice(0, 40)) {
							const fn = props[k]
							if (typeof fn !== 'function' || !/TapImage/.test(fn.name)) continue
							let wrapper = wrapped.get(fn)
							if (!wrapper) {
								wrapper = function (this: any, ...args: any[]) {
									try {
										const ev = args[0]
										const ne = ev?.nativeEvent
										const known = ne?.type === 'attachment' ? sizes.get(String(ne.id)) : undefined
										if (known && ne.layout?.width > 0 && ne.layout?.height > 0) {
											const index = pickIndex(known, ne.layout)
											if (index >= 0 && index !== ne.index) args = [Object.create(ev, { nativeEvent: { value: { ...ne, index } } }), ...args.slice(1)]
										}
									} catch {}
									return fn.apply(this, args)
								}
								wrapped.set(fn, wrapper)
							}
							props[k] = wrapper
						}
					} catch {}
					return el
				}),
			)
		probe(ReactJSXRuntime, 'jsx')
		probe(ReactJSXRuntime, 'jsxs')
		probe(React, 'createElement')

		cleanup(
			before(JSON, 'stringify', (args: any[]) => {
				try {
					const a = args[0]
					// Any array holding a grouped message row; batches can start with date separators, so check every item.
					if (Array.isArray(a) && a.length <= 500 && a.some(r => r?.message?.attachments?.length > 1)) return [splitRows(a), ...args.slice(1)]
				} catch {}
				return args
			}),
		)
	},
})
