import { Design } from '@valenced/discord/design'
import { getStore, onFluxEventDispatched } from '@valenced/discord/flux'
import { ReactNative } from '@valenced/react'
import { beforeJSX } from '@valenced/react/jsx-runtime'

interface Activity {
	type: number
	state?: string
}

interface PresenceStore {
	getUserIds(): string[]
	getActivities(userId: string): Activity[]
}

export default plugin({
	start({ cleanup }) {
		let presence: PresenceStore | undefined
		let statuses = new Set<string>()

		// Custom status = activity type 4, text in `state`.
		const collect = (acts: Activity[] | undefined, into: Set<string>) => {
			for (const a of acts ?? []) {
				if (a?.type === 4 && a.state?.trim()) into.add(a.state.trim())
			}
		}

		const scan = () => {
			try {
				const next = new Set<string>()
				for (const id of presence?.getUserIds() ?? []) collect(presence?.getActivities(id), next)
				statuses = next
			} catch {}
		}

		const isStatus = (c: unknown) =>
			typeof c === 'string'
				? statuses.has(c.trim())
				: Array.isArray(c) && c.some(x => typeof x === 'string' && statuses.has(x.trim()))

		// Always return the args: Valenced uses the return value as the new args.
		const hook = (args: any) => {
			try {
				const props = args[1]
				if (props && !props.selectable && isStatus(props.children)) {
					return [args[0], { ...props, selectable: true, onPress: props.onPress ?? (() => {}) }, args[2]] as any
				}
			} catch {}
			return args
		}

		const timer = setInterval(scan, 10000)

		cleanup(
			() => clearInterval(timer),
			getStore<PresenceStore>('PresenceStore', store => {
				presence = store
				scan()
			}),
			onFluxEventDispatched<{ updates?: { activities?: Activity[] }[] }>('PRESENCE_UPDATES', payload => {
				try {
					for (const u of payload?.updates ?? []) collect(u?.activities, statuses)
				} catch {}
				return payload
			}),
		)

		for (const type of [ReactNative?.Text, (Design as any)?.Text].filter(Boolean)) {
			cleanup(beforeJSX(type as any, hook))
		}
	},
})
