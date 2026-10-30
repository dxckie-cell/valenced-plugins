// Show Images Link for Valenced: keeps the link text visible when a message is just a linked image.
//
// Discord hides the link of a message that is only links whose embeds are all "simple" (image or
// gif). Vencord's ImageLink patches that check to be always false. On mobile the check lives in two
// small helpers, checkForSimpleEmbedMessage and hasOnlySimpleEmbed (found by a name scan in 0.3.6).
// We patch both so a `true` result becomes `false`, which leaves the link in place; the embed is
// untouched, so the image still renders.
//
// 0.4.0 is an experiment: it shows one alert with what the two helpers returned.

type Cleanup = () => void

const TARGETS = ['checkForSimpleEmbedMessage', 'hasOnlySimpleEmbed']

const stats: Record<string, { calls: number; trueResults: number; types: Set<string> }> = {}
const notes: string[] = []

function findExports(name: string): any {
	const finders: any = (valenced as any).modules?.finders
	const found = finders.lookupModule(finders.filters.withProps(name))
	const exports = Array.isArray(found) ? found[0] : found
	return exports && typeof exports[name] === 'function' ? exports : exports?.default
}

function patchHelper(name: string): Cleanup | undefined {
	const owner = findExports(name)
	if (!owner || typeof owner[name] !== 'function') {
		notes.push(`${name}: module not found`)
		return undefined
	}

	stats[name] = { calls: 0, trueResults: 0, types: new Set() }
	const unpatch = valenced.patcher.after(owner, name, (_args: any, result: any) => {
		const s = stats[name]
		s.calls++
		s.types.add(typeof result)
		if (result === true) {
			s.trueResults++
			return false
		}
		return undefined
	})
	notes.push(`${name}: patched`)
	return typeof unpatch === 'function' ? (unpatch as Cleanup) : undefined
}

function showReport() {
	const lines = [...notes]
	for (const [name, s] of Object.entries(stats)) {
		lines.push(`${name}: calls ${s.calls}, true ${s.trueResults}, types ${[...s.types].join('/') || '-'}`)
	}
	try {
		;(valenced.react as any).ReactNative?.Alert?.alert('Show Images Link 0.4.0', lines.join('\n'))
	} catch {}
}

export default plugin({
	start({ cleanup, plugin }) {
		for (const name of TARGETS) {
			try {
				const unpatch = patchHelper(name)
				if (unpatch) cleanup(unpatch)
			} catch (error) {
				notes.push(`${name}: ${(error as any)?.message ?? error}`)
				plugin.reportError(error)
			}
		}
		const timer = setTimeout(showReport, 10000)
		cleanup(() => clearTimeout(timer))
	},
})
