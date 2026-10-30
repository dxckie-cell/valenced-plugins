// ImageLink for Valenced: keeps the link text visible when a message is just a linked image.
//
// DISCOVERY BUILD. Discord hides the link text of a message that is only an image URL. This
// build changes nothing on screen. It shows a toast and logs "[ImageLink] candidate" with the
// name of each component that receives such a message, so the right one can be patched.

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

function componentName(type: any): string {
	if (typeof type === 'string') return type
	return (
		type?.displayName ??
		type?.name ??
		type?.type?.displayName ??
		type?.type?.name ??
		type?.render?.displayName ??
		type?.render?.name ??
		'<anonymous>'
	)
}

function toast(text: string) {
	try {
		valenced.discord.actions?.ToastActionCreators?.open(`image-link-${Date.now()}`, { text } as any)
	} catch {}
}

/** Probes every JSX call and reports components that get a link-only image message. */
function patchJsxProbe(): Cleanup {
	const unpatches: Cleanup[] = []
	const seen = new Set<string>()
	const runtime: any = (valenced.react as any).ReactJSXRuntime

	for (const kind of ['jsx', 'jsxs']) {
		if (typeof runtime?.[kind] !== 'function') continue

		const unpatch = valenced.patcher.before(runtime, kind, (args: any) => {
			try {
				const [type, props] = args ?? []
				if (!props?.message || !isLinkedImageOnly(props.message)) return args

				const key = `${kind}:${componentName(type)}`
				if (seen.has(key)) return args
				seen.add(key)

				const keys = Object.keys(props).join(',')
				console.log(`[ImageLink] candidate ${key} props=${keys}`)
				toast(`ImageLink: ${key}`)
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
			cleanup(patchJsxProbe())
		} catch (error) {
			plugin.reportError(error)
		}
	},
})
