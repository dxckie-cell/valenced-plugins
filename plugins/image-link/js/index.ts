// Show Images Link: stops Discord from hiding the link of a message that is just a linked image.
// Same idea as Vencord's ImageLink: the "only simple embeds" helpers always answer false. They are
// exported from many modules (most just re-export them), so every module that holds one is patched.

const NAMES = ['checkForSimpleEmbedMessage', 'hasOnlySimpleEmbed']
const seen = new WeakSet<object>()

export default plugin({
	start({ cleanup, plugin }) {
		const metro = valenced.modules.metro as any

		const patch = (exports: any) => {
			for (const root of [exports, exports?.default]) {
				if (!root || seen.has(root)) continue
				for (const name of NAMES) {
					if (typeof root[name] === 'function') {
						seen.add(root)
						cleanup(valenced.patcher.after(root, name, () => false))
					}
				}
			}
		}

		const walk = () => {
			for (let id = 0; id < 40000; id++) {
				try {
					if (metro.isModuleInitialized(id)) patch(metro.getInitializedModuleExports(id))
				} catch {}
			}
		}

		try {
			walk()
			const stop = metro.onAnyModuleInitialized((_id: any, exports: any) => patch(exports))
			if (typeof stop === 'function') cleanup(stop)
			let passes = 0
			const timer = setInterval(() => (++passes > 10 ? clearInterval(timer) : walk()), 3000)
			cleanup(() => clearInterval(timer))
		} catch (error) {
			plugin.reportError(error)
		}
	},
})
