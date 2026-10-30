// Show Images Link for Valenced: keeps the link text visible when a message is just a linked image.
//
// Discord hides the link of a message that is only links whose embeds are all "simple" (image or
// gif). Vencord's ImageLink patches that check to be always false. On mobile the check lives in two
// small helpers, checkForSimpleEmbedMessage and hasOnlySimpleEmbed (found by a name scan in 0.3.6, then looked up by walking module ids).
// We patch both so a `true` result becomes `false`, which leaves the link in place; the embed is
// untouched, so the image still renders.
//
// 0.4.1 is an experiment: it shows one alert with what the two helpers returned.

type Cleanup = () => void

const TARGETS = ['checkForSimpleEmbedMessage', 'hasOnlySimpleEmbed']

const stats: Record<string, { calls: number; trueResults: number; types: Set<string> }> = {}
const notes: string[] = []

const patched = new Set<string>()
const unpatches: Cleanup[] = []
const MAX_ID = 40000

/** Patches the helpers if this module's exports hold them. */
function tryPatch(id: any, exports: any) {
	if (!exports || (typeof exports !== 'object' && typeof exports !== 'function')) return
	for (const root of [exports, exports.default]) {
		if (!root || (typeof root !== 'object' && typeof root !== 'function')) continue
		for (const name of TARGETS) {
			if (patched.has(name) || typeof root[name] !== 'function') continue
			patched.add(name)
			stats[name] = { calls: 0, trueResults: 0, types: new Set() }
			const unpatch = valenced.patcher.after(root, name, (_args: any, result: any) => {
				const s = stats[name]
				s.calls++
				s.types.add(typeof result)
				if (result === true) {
					s.trueResults++
					return false
				}
				return undefined
			})
			if (typeof unpatch === 'function') unpatches.push(unpatch as Cleanup)
			notes.push(`${name}: patched in module ${id}`)
		}
	}
}

/** Looks at every module that is already initialised. */
function walk() {
	const metro: any = (valenced as any).modules?.metro
	for (let id = 0; id < MAX_ID && patched.size < TARGETS.length; id++) {
		try {
			if (!metro.isModuleInitialized(id)) continue
			tryPatch(id, metro.getInitializedModuleExports(id))
		} catch {}
	}
}

function showReport() {
	const lines = [...notes]
	for (const name of TARGETS) if (!patched.has(name)) lines.push(`${name}: not found`)
	for (const [name, s] of Object.entries(stats)) {
		lines.push(`${name}: calls ${s.calls}, true ${s.trueResults}, types ${[...s.types].join('/') || '-'}`)
	}
	try {
		;(valenced.react as any).ReactNative?.Alert?.alert('Show Images Link 0.4.1', lines.join('\n'))
	} catch {}
}

export default plugin({
	start({ cleanup, plugin }) {
		try {
			const metro: any = (valenced as any).modules?.metro
			walk()

			// Modules that load later are caught here.
			if (typeof metro?.onAnyModuleInitialized === 'function') {
				const stop = metro.onAnyModuleInitialized((id: any, exports: any) => {
					try {
						tryPatch(id, exports)
					} catch {}
				})
				if (typeof stop === 'function') cleanup(stop)
			}

			// And a few retries, in case that hook is not what I think it is.
			let tries = 0
			const retry = setInterval(() => {
				if (patched.size >= TARGETS.length || ++tries > 20) return clearInterval(retry)
				walk()
			}, 3000)
			cleanup(() => clearInterval(retry))
		} catch (error) {
			plugin.reportError(error)
		}
		cleanup(() => {
			for (const u of unpatches.splice(0)) u()
		})
		const timer = setTimeout(showReport, 10000)
		cleanup(() => clearTimeout(timer))
	},
})
