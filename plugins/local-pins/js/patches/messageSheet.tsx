import * as assets from '@valenced/assets'
import { ActionSheetActionCreators } from '@valenced/discord/actions'
import { after, before } from '@valenced/patcher'
import { findExport, toast } from '../lib/discord'
import { addPin, hasPin, removePin } from '../lib/state'

/**
 * Adds "Pin Message Locally" right below the server's "Pin Message" row in the long-press sheet.
 * Same `openLazy` technique as other Next plugins: remember the message, then patch the sheet
 * module's default export so the rendered tree gets our row.
 */
const SYM = Symbol.for('dxckie.local-pins')
const patched = new WeakSet<any>()
let current: { channelId: string; id: string; author: string } | undefined

const labelOf = (n: any) => n?.props?.label ?? n?.props?.message
const isServerPin = (n: any) => typeof labelOf(n) === 'string' && /^(un)?pin message$/i.test(labelOf(n))

/** Every array of children in the tree, so the row can be spliced in next to its sibling. */
function findInList(tree: any, test: (n: any) => boolean): { list: any[]; at: number } | undefined {
	const seen = new Set<any>()
	const visit = (node: any, depth: number): any => {
		if (!node || typeof node !== 'object' || depth > 40 || seen.has(node)) return
		seen.add(node)
		if (Array.isArray(node)) {
			const at = node.findIndex(test)
			if (at >= 0) return { list: node, at }
			for (const child of node) {
				const hit = visit(child, depth + 1)
				if (hit) return hit
			}
			return
		}
		return visit(node.props?.children, depth + 1) ?? visit(node.props, depth + 1)
	}
	return visit(tree, 0)
}

function inject(rendered: any, target: NonNullable<typeof current>) {
	const Row = findExport('ActionSheetRow')?.ActionSheetRow
	if (!Row) return false
	const { getAssetIdByName } = assets
	const pinned = hasPin(target.channelId, target.id)

	const row = (
		<Row
			key="local-pin"
			label={pinned ? 'Unpin Message Locally' : 'Pin Message Locally'}
			icon={<Row.Icon source={getAssetIdByName('PinIcon')} />}
			onPress={() => {
				if (pinned) removePin(target.channelId, target.id)
				else addPin(target.channelId, target.id)
				toast(`${pinned ? 'Unpinned' : 'Pinned'} ${target.author}'s message locally`)
				try {
					ActionSheetActionCreators.hideActionSheet()
				} catch {}
			}}
		/>
	)

	// preferred: directly below the server's Pin Message row
	const hit = findInList(rendered, isServerPin)
	if (hit) {
		hit.list.splice(hit.at + 1, 0, row)
		return true
	}

	// no server pin row (e.g. no permission): our own group at the top of the sheet's groups
	const Group = Row.Group
	const group = findInList(rendered, n => n?.type === Group)
	if (!group || !Group) return false
	group.list.unshift(<Group key="local-pin-group">{row}</Group>)
	return true
}

function patchSheetModule(mod: any, patches: Array<() => void>) {
	if (!mod || typeof mod.default !== 'function' || patched.has(mod)) return mod
	const apply = (rendered: any) => {
		try {
			if (current && rendered != null && !rendered[SYM] && inject(rendered, current)) rendered[SYM] = true
		} catch {}
		return rendered
	}
	try {
		patches.push(after(mod, 'default', apply))
		patched.add(mod)
		return mod
	} catch {
		const Original = mod.default
		return { ...mod, default: (props: any) => apply(Original(props)) }
	}
}

export default function patchMessageSheet(): () => void {
	const patches: Array<() => void> = []

	patches.push(
		before(ActionSheetActionCreators as any, 'openLazy', (args: any[]) => {
			try {
				const [sheet, key, props] = args
				const message = props?.message
				current = undefined
				if (
					typeof key === 'string' && /message/i.test(key) && !/channel|forum|guild|thread/i.test(key)
					&& typeof message?.id === 'string' && typeof message?.channel_id === 'string'
					&& typeof sheet?.then === 'function'
				) {
					current = {
						channelId: message.channel_id,
						id: message.id,
						author: message.nick ?? message.author?.globalName ?? message.author?.username ?? 'unknown',
					}
					args[0] = sheet.then((mod: any) => patchSheetModule(mod, patches))
				}
			} catch {}
			return args // a before-hook must return the args
		}),
	)

	return () => {
		for (const unpatch of patches) {
			try {
				unpatch()
			} catch {}
		}
	}
}
