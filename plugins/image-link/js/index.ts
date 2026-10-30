// Show Images Link for Valenced: keeps the link text visible when a message is just a linked image.
//
// Vencord's ImageLink patches a small util module (it holds { linkCount: 0, onlyLinks: false }) so
// that "embed type is simple and embed is inline" is never true; Discord then never hides the link.
// 0.3.2 only looks for that module in the running app: it lists exports whose names look related
// and shows them in one alert. Nothing changes on screen.

type Cleanup = () => void

const NAME_HINT = /simple|inline|onlyLink|linkCount|hideContent|shouldHide|embedOnly|hideLink/i

function modulesObject(): { source: string; mods: any } | undefined {
	const g: any = globalThis
	const tries: [string, () => any][] = [
		['globalThis.modules', () => g.modules],
		['valenced.modules.metro', () => (valenced as any).modules?.metro?.modules],
		['__r.getModules', () => g.__r?.getModules?.()],
	]
	for (const [source, get] of tries) {
		try {
			const mods = get()
			if (mods && (typeof mods.size === 'number' || typeof mods === 'object')) return { source, mods }
		} catch {}
	}
	return undefined
}

function scan(): string {
	const found = modulesObject()
	if (!found) return 'no module registry found'

	const entries: [any, any][] = typeof found.mods.entries === 'function' ? [...found.mods.entries()] : Object.entries(found.mods)
	const lines: string[] = [`registry: ${found.source}, ${entries.length} modules`]
	let looked = 0

	for (const [id, mod] of entries) {
		let exports: any
		try {
			exports = mod?.publicModule?.exports ?? mod?.exports
		} catch {
			continue
		}
		if (!exports || (typeof exports !== 'object' && typeof exports !== 'function')) continue
		looked++

		let keys: string[] = []
		try {
			keys = Object.keys(exports)
		} catch {}
		const roots = [['', exports], ...(exports.default && typeof exports.default === 'object' ? [['default.', exports.default]] : [])] as [string, any][]
		for (const [prefix, obj] of roots) {
			let ks: string[] = []
			try {
				ks = Object.keys(obj)
			} catch {}
			for (const k of ks) {
				let name = ''
				try {
					name = typeof obj[k] === 'function' ? obj[k].name || '' : ''
				} catch {}
				if (NAME_HINT.test(k) || NAME_HINT.test(name)) {
					lines.push(`${id}: ${prefix}${k}${name && name !== k ? `(${name})` : ''} [${keys.length}k]`)
				}
			}
		}
		if (lines.length >= 24) break
	}
	lines.splice(1, 0, `initialised: ${looked}`)
	return lines.join('\n')
}

function patch(): Cleanup {
	const timer = setTimeout(() => {
		let report: string
		try {
			report = scan()
		} catch (e: any) {
			report = `scan failed: ${e?.message ?? e}`
		}
		try {
			;(valenced.react as any).ReactNative?.Alert?.alert('Show Images Link 0.3.2', report)
		} catch {}
	}, 3000)
	return () => clearTimeout(timer)
}

export default plugin({
	start({ cleanup, plugin }) {
		try {
			cleanup(patch())
		} catch (error) {
			plugin.reportError(error)
		}
	},
})
