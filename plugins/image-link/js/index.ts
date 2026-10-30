// Show Images Link for Valenced: keeps the link text visible when a message is just a linked image.
//
// Vencord's ImageLink patches a small util module (it holds { linkCount: 0, onlyLinks: false }) so
// that "embed type is simple and embed is inline" is never true; Discord then never hides the link.
// 0.3.4 only looks for that module in the running app: it lists the finder API and exports whose
// names look related, in one alert. Nothing changes on screen.

type Cleanup = () => void

const NAME_HINT = /simple|inline|onlyLink|linkCount|hideContent|shouldHide|embedOnly|hideLink/i

function keysOf(v: any): string {
	try {
		return v && (typeof v === 'object' || typeof v === 'function') ? Object.keys(v).join(',') : String(v)
	} catch (e: any) {
		return `<err ${e?.message ?? e}>`
	}
}

/** Looks through Valenced's metro helpers for the module registry and scans its exports. */
function scanMetro(lines: string[]) {
	const metro: any = (valenced as any).modules?.metro
	lines.push(`metro: ${keysOf(metro)}`)

	const candidates: [string, () => any][] = [
		['metro.modules', () => metro?.modules],
		['metro.getModules()', () => metro?.getModules?.()],
		['metro.registry', () => metro?.registry],
		['metro.require.modules', () => metro?.require?.modules],
	]
	for (const [label, get] of candidates) {
		let mods: any
		try {
			mods = get()
		} catch {
			continue
		}
		if (!mods || typeof mods !== 'object') continue

		const entries: [any, any][] = typeof mods.entries === 'function' ? [...mods.entries()] : Object.entries(mods)
		lines.push(`${label}: ${entries.length} entries, first=${keysOf(entries[0]?.[1])}`)
		let tested = 0
		let found = 0
		for (const [id, mod] of entries) {
			let exports: any
			try {
				exports = mod?.publicModule?.exports ?? mod?.exports
			} catch {
				continue
			}
			if (!exports || (typeof exports !== 'object' && typeof exports !== 'function')) continue
			tested++
			for (const root of [exports, exports.default]) {
				if (!root || (typeof root !== 'object' && typeof root !== 'function')) continue
				let ks: string[] = []
				try {
					ks = Object.keys(root)
				} catch {}
				for (const k of ks) {
					let name = ''
					try {
						name = typeof root[k] === 'function' ? root[k].name || '' : ''
					} catch {}
					if ((NAME_HINT.test(k) || NAME_HINT.test(name)) && found < 16) {
						found++
						lines.push(`${id}: ${root === exports ? '' : 'default.'}${k}${name && name !== k ? `(${name})` : ''}`)
					}
				}
			}
		}
		lines.push(`scanned ${tested} modules`)
		return
	}
	lines.push('no registry among the candidates')
}

function scan(): string {
	const v: any = valenced
	const lines: string[] = [`finders.filters: ${keysOf(v.modules?.finders?.filters)}`]
	try {
		scanMetro(lines)
	} catch (e: any) {
		lines.push(`scan error: ${e?.message ?? e}`)
	}
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
			;(valenced.react as any).ReactNative?.Alert?.alert('Show Images Link 0.3.4', report)
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
