// Show Images Link for Valenced: keeps the link text visible when a message is just a linked image.
//
// Discord builds each chat row from the message and passes it to the list's `modifyRow` prop. For a
// message that is only a link to an image or gif, that parsed content comes out empty, so no link is
// drawn. We rebuild the link node from the embed URL, and the image still renders as before.
//
// 0.3.1 is an experiment: it shows one alert after the first fixed row, with the content before
// and after, so we can tell whether the fix took.

type Cleanup = () => void

// Discord embed types that render as a bare image or gif.
const IMAGE_EMBED_TYPES = new Set(['image', 'gifv'])


/** True when the message is a single URL that Discord turned into an image or gif embed. */
function isLinkedImageOnly(message: any): boolean {
	const content = typeof message?.content === 'string' ? message.content.trim() : ''
	if (!content) return false

	// One URL and no other text. Angle brackets around it are allowed.
	const match = /^<?(https?:\/\/\S+?)>?$/.exec(content)
	if (!match) return false

	const embeds: any[] = Array.isArray(message.embeds) ? message.embeds : []
	return embeds.length === 1 && IMAGE_EMBED_TYPES.has(embeds[0]?.type) && embeds[0]?.url === match[1]
}

/** The real message behind a chat row. */
function storeMessage(row: any): any {
	try {
		const m = row?.message
		const store = (valenced.discord.flux as any).Stores?.MessageStore
		return store?.getMessage?.(m?.channelId, m?.id)
	} catch {
		return undefined
	}
}

// ---- Experiment report ----

let fixedRows = 0
const report: string[] = []
let reportStarted = false

function text(v: any): string {
	try {
		const json = JSON.stringify(v)
		if (json === undefined) return String(v)
		return json.length > 300 ? `${json.slice(0, 300)}~` : json
	} catch (e: any) {
		return `<err ${e?.message ?? e}>`
	}
}

function startReport() {
	if (reportStarted) return
	reportStarted = true
	setTimeout(() => {
		try {
			const alert = (valenced.react as any).ReactNative?.Alert
			alert?.alert('Show Images Link 0.3.1', `fixed rows: ${fixedRows}\n${report.join('\n')}`)
		} catch {}
	}, 3000)
}

// ---- end Experiment report ----

/** Gives a link-only image row the link it was built without. Returns true if changed. */
function fixRow(row: any): boolean {
	const msg = row?.message
	if (!msg || !Array.isArray(msg.content)) return false
	if (msg.content.some((n: any) => n?.type === 'link')) return false

	const source = storeMessage(row)
	if (!source || !isLinkedImageOnly(source)) return false
	const url: string = source.embeds[0].url

	const before = text(msg.content)
	msg.content = [{ type: 'link', content: [{ type: 'text', content: url }], target: url }]

	fixedRows++
	if (report.length < 4) {
		report.push(`before: ${before}`)
		report.push(`after: ${text(msg.content)}`)
	}
	startReport()
	return true
}

const wrappedModifiers = new WeakMap<object, any>()

function wrapModifyRow(fn: any): any {
	let wrapper = wrappedModifiers.get(fn)
	if (!wrapper) {
		wrapper = function (this: any, ...args: any[]) {
			const out = fn.apply(this, args)
			try {
				fixRow(args[0])
			} catch (e: any) {
				if (report.length < 4) report.push(`error: ${e?.message ?? e}`)
				startReport()
			}
			return out
		}
		wrappedModifiers.set(fn, wrapper)
	}
	return wrapper
}

/** Wraps the modifyRow prop of whatever component receives one. */
function patchJsx(): Cleanup {
	const unpatches: Cleanup[] = []
	const runtime: any = (valenced.react as any).ReactJSXRuntime

	for (const kind of ['jsx', 'jsxs']) {
		if (typeof runtime?.[kind] !== 'function') continue

		const unpatch = valenced.patcher.before(runtime, kind, (args: any) => {
			try {
				const props = args?.[1]
				if (props && typeof props.modifyRow === 'function') {
					const next = [...args]
					next[1] = { ...props, modifyRow: wrapModifyRow(props.modifyRow) }
					return next
				}
			} catch {}
			return args
		})
		if (typeof unpatch === 'function') unpatches.push(unpatch as Cleanup)
	}

	return () => {
		for (const u of unpatches) u()
	}
}

export default plugin({
	start({ cleanup, plugin }) {
		try {
			cleanup(patchJsx())
		} catch (error) {
			plugin.reportError(error)
		}
	},
})
