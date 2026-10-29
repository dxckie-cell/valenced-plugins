// HideMessages for Valenced: long-press a message and tap "Hide" to remove it from your
// view until you restart Discord. Local only, nothing is deleted on Discord.

const { React } = valenced.react

type Cleanup = () => void

const SHEET_KEY = 'MessageLongPressActionSheet'
const ICON_NAMES = ['ic_visibility', 'ic_visibility_24px', 'ic_eye', 'ic_show_password', 'EyeIcon']

let pending: { message: any } | null = null

function toast(text: string, critical = false) {
	try {
		valenced.discord.actions?.ToastActionCreators?.open(
			`hide-messages-${Date.now()}`,
			{ text, ...(critical ? { variant: 'critical' } : {}) } as any,
		)
	} catch {}
}

const isDispatcher = (d: any) => !!d && typeof d.dispatch === 'function' && typeof d.subscribe === 'function'

/** Finds Discord's Flux dispatcher, trying every place it might be exposed. */
function getDispatcher(): any {
	const attempts: (() => any)[] = [
		() => (valenced.discord.flux as any).Dispatcher,
		() => (valenced.discord as any).common?.flux?.Dispatcher,
		() => (valenced.discord as any).common?.flux?.FluxDispatcher,
		() => {
			const f = (valenced.modules as any).finders
			const found = f.lookupModule(f.filters.withProps('dispatch', 'subscribe', 'wait'))
			return Array.isArray(found) ? found[0] : found
		},
	]
	for (const attempt of attempts) {
		try {
			const d = attempt()
			if (isDispatcher(d)) return d
		} catch {}
	}
	return undefined
}

function messageStore(): any {
	try {
		return (valenced.discord.flux as any).Stores?.MessageStore
	} catch {
		return undefined
	}
}

/** Removes a message from this client only. Returns false if it is still in the store. */
function hideMessage(messageId: string, channelId: string): boolean {
	const dispatcher: any = getDispatcher()
	if (!dispatcher) throw new Error("couldn't find Discord's dispatcher")
	const store = messageStore()
	const stillThere = () => {
		try {
			return !!store?.getMessage?.(channelId, messageId)
		} catch {
			return false
		}
	}

	// Message-logger plugins hook dispatch and rewrite deletes. The prototype's original
	// dispatch skips every such hook.
	const bypass = { mlDeleted: true, otherPluginBypass: true }
	const raw = (action: any) => {
		const orig = Object.getPrototypeOf(dispatcher)?.dispatch
		if (typeof orig === 'function') orig.call(dispatcher, action)
		else dispatcher.dispatch(action)
	}

	raw({ type: 'MESSAGE_DELETE', id: messageId, channelId, ...bypass })
	if (stillThere()) dispatcher.dispatch({ type: 'MESSAGE_DELETE', id: messageId, channelId, ...bypass })
	if (stillThere()) raw({ type: 'MESSAGE_DELETE_BULK', ids: [messageId], channelId, ...bypass })
	return !stillThere()
}

const isRow = (c: any) => !!c && typeof c === 'object' && !!c.props && typeof c.props.label === 'string'

/** Finds the last array of children that holds rows with labels. */
function findLastRowArray(node: any, seen = new Set<any>(), depth = 0): any[] | null {
	if (!node || typeof node !== 'object' || depth > 24 || seen.has(node)) return null
	seen.add(node)

	let found: any[] | null = null
	if (Array.isArray(node)) {
		if (node.some(isRow)) found = node
		for (const child of node) {
			const inner = findLastRowArray(child, seen, depth + 1)
			if (inner) found = inner
		}
		return found
	}
	if (node.props) return findLastRowArray(node.props.children, seen, depth + 1)
	return null
}

function makeIcon(template: any) {
	try {
		const assets: any = valenced.assets
		const Icon: any = (valenced.components as any).TableRowAssetIcon
		for (const name of ICON_NAMES) {
			if (assets.getAssetIdByName?.(name) !== undefined && Icon) {
				return React.createElement(Icon, { name })
			}
		}
	} catch {}
	return undefined
}

function insertHideRow(res: any, message: any) {
	const rows = findLastRowArray(res)
	if (!rows) return

	const lastAt = rows.reduce((at: number, c: any, i: number) => (isRow(c) ? i : at), -1)
	const template = rows[lastAt]
	if (!template) return

	const hide = () => {
		try {
			const channelId = message.channel_id ?? message.channelId
			toast(hideMessage(message.id, channelId) ? 'Message hidden' : "Couldn't hide: a message logger may be keeping it")
		} catch (e: any) {
			toast(`Hide failed: ${e?.message ?? e}`, true)
		}
		try {
			;(valenced.discord.actions as any)?.ActionSheetActionCreators?.hideActionSheet?.()
		} catch {}
	}

	rows.splice(
		lastAt + 1,
		0,
		React.createElement(template.type, {
			key: 'hide-message',
			label: 'Hide',
			icon: makeIcon(template),
			onPress: hide,
		}),
	)
}

/** Remembers which message the long-press sheet is open for. */
function patchOpenLazy(): Cleanup {
	const unpatches: Cleanup[] = []
	const stop = (valenced as any).discord.utils.modules.finders.getModuleWithImportedPath(
		'modules/action_sheet/native/ActionSheetActionCreators.tsx',
		(ns: any) => {
			const owner = ns?.default ?? ns
			if (typeof owner?.openLazy !== 'function') return
			const unpatch = valenced.patcher.before(owner, 'openLazy', (args: any) => {
				const [, key, loc] = args ?? []
				pending = key === SHEET_KEY && loc?.message ? { message: loc.message } : null
				return args
			})
			if (typeof unpatch === 'function') unpatches.push(unpatch as Cleanup)
		},
	)
	if (typeof stop === 'function') unpatches.push(stop)
	return () => {
		for (const u of unpatches) u()
	}
}

/** Adds the Hide row to the message long-press sheet. */
function patchLongPressSheet(): Cleanup {
	const unpatches: Cleanup[] = []
	const stop = (valenced as any).discord.utils.modules.finders.getModuleWithImportedPath(
		'modules/messages/native/long_press/LongPressMessageActionSheet.tsx',
		(ns: any) => {
			const original = ns?.default
			if (typeof original !== 'function') return

			const wrapped = (props: any) => {
				const res = original(props)
				try {
					if (pending) insertHideRow(res, pending.message)
				} catch (e: any) {
					toast(`HideMessages: ${e?.message ?? e}`, true)
				}
				return res
			}
			ns.default = wrapped
			unpatches.push(() => {
				if (ns.default === wrapped) ns.default = original
			})
		},
	)
	if (typeof stop === 'function') unpatches.push(stop)
	return () => {
		for (const u of unpatches) u()
	}
}

export default plugin({
	start({ cleanup, plugin }) {
		for (const patch of [patchOpenLazy, patchLongPressSheet]) {
			try {
				cleanup(patch())
			} catch (error) {
				plugin.reportError(error)
			}
		}
	},
	stop() {
		pending = null
	},
})
