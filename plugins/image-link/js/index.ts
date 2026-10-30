// Show Images Link for Valenced: keeps the link text visible when a message is just a linked image.
//
// Discord hides the link of a message whose whole content is one URL that became an image or gif
// embed. The message reaches MeasureMessage, DCDChatItem and an anonymous default component as a
// `message` prop. For such a message we pass those components a view of it whose content starts
// with an invisible character, so it no longer looks like "only a URL" and the link stays shown.
// The embed is untouched, so the image still renders.

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
					const next = [...args]
					next[1] = { ...props, message: withVisibleLink(message) }
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
	stop() {
		views = new WeakMap()
	},
})
