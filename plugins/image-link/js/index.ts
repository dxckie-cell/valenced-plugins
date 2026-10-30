// Show Images Link for Valenced: keeps the link text visible when a message is just a linked image.
//
// Discord hides the link of a message whose whole content is one URL that became an image or gif
// embed. The message reaches MeasureMessage, DCDChatItem and an anonymous default component as a
// `message` prop. For such a message we pass those components a view of it whose content starts
// with an invisible character, so it no longer looks like "only a URL" and the link stays shown.
// The embed is untouched, so the image still renders.
//
// 0.2.1 also carries a DEBUG probe: after the first link-only image message renders, it shows one
// alert listing every component that received that message, so the real hide point can be found.

type Cleanup = () => void

// Discord embed types that render as a bare image or gif.
const IMAGE_EMBED_TYPES = new Set(['image', 'gifv'])

// Zero width space. String.trim does not remove it.
const MARKER = '​'

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

// One view per message object, so the same message keeps the same reference between renders.
let views = new WeakMap<object, any>()

/** A read-through view of the message with the marker in front of its content. */
function withVisibleLink(message: any): any {
	let view = views.get(message)
	if (!view) {
		view = Object.create(message, {
			content: { value: MARKER + message.content, enumerable: true, configurable: true, writable: true },
		})
		views.set(message, view)
	}
	return view
}


// ---- DEBUG probe (remove once the hide point is found) ----

let debugId: string | undefined
let debugStarted = false
const debugLines: string[] = []
const debugSeen = new Set<string>()

function brief(v: any): string {
	if (typeof v === 'string') return JSON.stringify(v.length > 24 ? `${v.slice(0, 24)}~` : v)
	if (v == null || typeof v === 'boolean' || typeof v === 'number') return String(v)
	if (Array.isArray(v)) return `[${v.length}]`
	return typeof v === 'function' ? 'fn' : 'obj'
}

function componentName(type: any): string {
	if (typeof type === 'string') return type
	return (
		type?.displayName ??
		type?.name ??
		type?.type?.displayName ??
		type?.type?.name ??
		type?.render?.displayName ??
		type?.render?.name ??
		'<anon>'
	)
}

function touchesDebugMessage(props: any): boolean {
	if (!debugId || !props) return false
	return props.message?.id === debugId || props.messageId === debugId || props.id === debugId
}

function recordDebug(kind: string, type: any, props: any) {
	const keys = Object.keys(props).map((k) => {
		if (k === 'message') return `message(marked=${String(props.message?.content).startsWith(MARKER)})`
		return /^(content|hide|embed|text|link|only|media|show|parsed)/i.test(k) ? `${k}=${brief(props[k])}` : k
	})
	const line = `${kind}:${componentName(type)} ${keys.join(',')}`
	if (debugSeen.has(line) || debugLines.length >= 24) return
	debugSeen.add(line)
	debugLines.push(line)
}

function startDebug(message: any) {
	if (debugStarted) return
	debugStarted = true
	debugId = message.id
	setTimeout(() => {
		try {
			const alert = (valenced.react as any).ReactNative?.Alert
			alert?.alert('ImageLink debug 0.2.1', debugLines.join('\n') || '(nothing recorded)')
		} catch {}
	}, 2500)
}

// ---- end DEBUG probe ----

/** Swaps the message prop for link-only image messages on every JSX call. */
function patchJsx(): Cleanup {
	const unpatches: Cleanup[] = []
	const runtime: any = (valenced.react as any).ReactJSXRuntime

	for (const kind of ['jsx', 'jsxs']) {
		if (typeof runtime?.[kind] !== 'function') continue

		const unpatch = valenced.patcher.before(runtime, kind, (args: any) => {
			try {
				const props = args?.[1]
				const message = props?.message
				if (message && isLinkedImageOnly(message)) {
					startDebug(message)
					recordDebug(kind, args[0], props)
					const next = [...args]
					next[1] = { ...props, message: withVisibleLink(message) }
					return next
				}
				if (touchesDebugMessage(props)) recordDebug(kind, args[0], props)
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
	stop() {
		views = new WeakMap()
	},
})
