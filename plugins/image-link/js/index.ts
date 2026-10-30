// Show Images Link for Valenced: keeps the link text visible when a message is just a linked image.
//
// Discord hides the link of a message that is only links whose embeds are all "simple" (image or
// gif). Vencord's ImageLink patches that check to be always false. On mobile the check is made by
// two small helpers, checkForSimpleEmbedMessage and hasOnlySimpleEmbed. They are exported from
// several modules (some only re-export them), so every module that holds one is patched, including
// modules that load later. The embed is untouched, so the image still renders.

type Cleanup = () => void

const TARGETS = ['checkForSimpleEmbedMessage', 'hasOnlySimpleEmbed']
const MAX_ID = 40000

const patchedPairs = new WeakMap<object, Set<string>>()
const unpatches: Cleanup[] = []

/** Patches the helpers if this module's exports hold them. */
function tryPatch(exports: any) {
	if (!exports || (typeof exports !== 'object' && typeof exports !== 'function')) return
	for (const root of [exports, exports.default]) {
		if (!root || (typeof root !== 'object' && typeof root !== 'function')) continue
		for (const name of TARGETS) {
			if (typeof root[name] !== 'function') continue

			let done = patchedPairs.get(root)
			if (!done) patchedPairs.set(root, (done = new Set()))
			if (done.has(name)) continue
			done.add(name)

			const unpatch = valenced.patcher.after(root, name, () => false)
			if (typeof unpatch === 'function') unpatches.push(unpatch as Cleanup)
		}
	}
}

/** Looks at every module that is already initialised. */
function walk() {
	const metro: any = (valenced as any).modules?.metro
	for (let id = 0; id < MAX_ID; id++) {
		try {
			if (!metro.isModuleInitialized(id)) continue
			tryPatch(metro.getInitializedModuleExports(id))
		} catch {}
	}
}

export default plugin({
	start({ cleanup, plugin }) {
		try {
			const metro: any = (valenced as any).modules?.metro
			walk()

			// Modules that load later are caught here.
			if (typeof metro?.onAnyModuleInitialized === 'function') {
				const stop = metro.onAnyModuleInitialized((_id: any, exports: any) => {
					try {
						tryPatch(exports)
					} catch {}
				})
				if (typeof stop === 'function') cleanup(stop)
			}

			// A few more passes, in case that hook misses something.
			let tries = 0
			const retry = setInterval(() => {
				if (++tries > 10) return clearInterval(retry)
				walk()
			}, 3000)
			cleanup(() => clearInterval(retry))
		} catch (error) {
			plugin.reportError(error)
		}

		cleanup(() => {
			for (const unpatch of unpatches.splice(0)) unpatch()
		})
	},
})
