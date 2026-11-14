import { ToastActionCreators } from '@valenced/discord/actions'
import { Stores } from '@valenced/discord/flux'
import { instead } from '@valenced/patcher'
import { pastelHex } from './color'
import { getSettings } from './state'

// Gives member list rows a pastel name color.
// shortcut: assumes rows look like { type: 'MEMBER', member: { colorString } }, check if the list stays uncolored.
export function patchMemberList(cleanup: (fn: () => void) => void, onError: (e: unknown) => void) {
	const store = (Stores as any).GuildMemberListStore

	// DEBUG: shows what the member list store looks like, until the member list is colored.
	const say = (text: string) => {
		try {
			;(ToastActionCreators as any).openMana('PastelizeDebug', { text: text.slice(0, 400) })
		} catch {}
	}
	say(`store: ${Object.keys(store ?? {}).slice(0, 25).join(',')}`)
	let shown = false

	// Many member list rows read the color from the member itself.
	const members = (Stores as any).GuildMemberStore
	if (typeof members?.getMember === 'function') {
		cleanup(
			instead(members, 'getMember', function (this: unknown, args: any[], original: any) {
				const member = original.apply(this, args)
				const { memberListColors, pastelizeAll } = getSettings()
				if (!memberListColors || !member || (!pastelizeAll && member.colorString)) return member
				return { ...member, colorString: pastelHex(args[1]) }
			}),
		)
	}

	if (typeof store?.getRows !== 'function') return

	cleanup(
		instead(store, 'getRows', function (this: unknown, args: any[], original: any) {
			const rows = original.apply(this, args)
			if (!shown && Array.isArray(rows) && rows.length) {
				shown = true
				const r = rows.find((x: any) => x?.type === 'MEMBER') ?? rows[0]
				say(`row: ${JSON.stringify(r, (_k, v) => (typeof v === 'object' && v ? v : String(v).slice(0, 30)))}`)
			}
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
