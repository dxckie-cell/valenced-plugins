import { Stores } from '@valenced/discord/flux'
import { instead } from '@valenced/patcher'
import { pastelHex } from './color'
import { getSettings } from './state'

// Gives member list rows a pastel name color.
// shortcut: assumes rows look like { type: 'MEMBER', member: { colorString } }, check if the list stays uncolored.
export function patchMemberList(cleanup: (fn: () => void) => void, onError: (e: unknown) => void) {
	const store = (Stores as any).GuildMemberListStore
	if (typeof store?.getRows !== 'function') return

	cleanup(
		instead(store, 'getRows', function (this: unknown, args: any[], original: any) {
			const rows = original.apply(this, args)
			const { memberListColors, pastelizeAll } = getSettings()
			if (!memberListColors || !Array.isArray(rows)) return rows
			try {
				return rows.map(row => {
					if (row?.type !== 'MEMBER') return row
					const target = row.member ?? row
					const id = target.userId ?? target.user?.id ?? target.id
					if (!id || (!pastelizeAll && target.colorString)) return row
					const colored = { ...target, colorString: pastelHex(id) }
					return row.member ? { ...row, member: colored } : colored
				})
			} catch (e) {
				onError(e)
				return rows
			}
		}),
	)
}
