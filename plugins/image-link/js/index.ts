// Show Images Link for Valenced: keeps the link text visible when a message is just a linked image.
//
// Discord hides the link of a message whose whole content is one URL that became an image or gif
// embed. The message reaches MeasureMessage, DCDChatItem and an anonymous default component as a
// `message` prop. For such a message we pass those components a view of it whose content starts
// with an invisible character, so it no longer looks like "only a URL" and the link stays shown.
// The embed is untouched, so the image still renders.
//
// 0.2.2 also hooks the list's rowGenerator and modifyRow props, because rows are built from the
// message ahead of rendering.
//
// The DEBUG probe (from 0.2.1): after the first link-only image message renders, it shows one
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

function recordLine(line: string) {
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
			alert?.alert('ImageLink debug 0.2.2', debugLines.join('\n') || '(nothing recorded)')
		} catch {}
	}, 2500)
}

// ---- end DEBUG probe ----

// ---- Row hooks ----

const ROW_KEYS = /^(content|hide|embed|type|only|text|link|media|show|parsed|message|id)/i

function describe(v: any): string {
	if (!v || typeof v !== 'object') return brief(v)
	const keys = Object.keys(v)
		.slice(0, 14)
		.map((k) => (ROW_KEYS.test(k) ? `${k}=${brief(v[k])}` : k))
	return `{${keys.join(',')}}`
}

/** Passes a link-only image message (or an object that holds one) on with the marked view. */
function substitute(arg: any): any {
	try {
		if (arg && typeof arg === 'object') {
			if (isLinkedImageOnly(arg)) return withVisibleLink(arg)
			if (arg.message && isLinkedImageOnly(arg.message)) {
				return Object.create(arg, {
					message: { value: withVisibleLink(arg.message), enumerable: true, configurable: true, writable: true },
				})
			}
		}
	} catch {}
	return arg
}

const linkRows = new WeakSet<object>()
const wrappedRowGenerators = new WeakMap<object, any>()
const wrappedModifiers = new WeakMap<object, any>()

/** Wraps rowGenerator so rows for link-only image messages are built from the marked view. */
function wrapRowGenerator(fn: any): any {
	let wrapper = wrappedRowGenerators.get(fn)
	if (!wrapper) {
		wrapper = function (this: any, ...args: any[]) {
			const next = args.map(substitute)
			const changed = next.some((a, i) => a !== args[i])
			const row = fn.apply(this, next)
			if (changed) {
				if (row && typeof row === 'object') linkRows.add(row)
				recordLine(`rowGenerator(${args.map(describe).join(' | ')}) -> ${describe(row)}`)
			}
			return row
		}
		wrappedRowGenerators.set(fn, wrapper)
	}
	return wrapper
}

/** Wraps modifyRow only to report what it does to rows built for link-only image messages. */
function wrapModifyRow(fn: any): any {
	let wrapper = wrappedModifiers.get(fn)
	if (!wrapper) {
		wrapper = function (this: any, ...args: any[]) {
			const out = fn.apply(this, args)
			try {
				if (args.some((a) => a && typeof a === 'object' && linkRows.has(a))) {
					recordLine(`modifyRow(${args.map(describe).join(' | ')}) -> ${describe(out)}`)
				}
			} catch {}
			return out
		}
		wrappedModifiers.set(fn, wrapper)
	}
	return wrapper
}

// ---- end Row hooks ----

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
					const nextProps: any = { ...props, message: withVisibleLink(message) }
					if (typeof props.rowGenerator === 'function') nextProps.rowGenerator = wrapRowGenerator(props.rowGenerator)
					if (typeof props.modifyRow === 'function') nextProps.modifyRow = wrapModifyRow(props.modifyRow)
					next[1] = nextProps
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
