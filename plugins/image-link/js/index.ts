// Show Images Link for Valenced: keeps the link text visible when a message is just a linked image.
//
// Vencord's ImageLink patches a small util module (it holds { linkCount: 0, onlyLinks: false }) so
// that "embed type is simple and embed is inline" is never true; Discord then never hides the link.
// 0.3.6 only looks for that module in the running app: it lists the finder API and exports whose
// names look related, in one alert. Nothing changes on screen.

type Cleanup = () => void

const NAME_HINT = /embed.*(inline|simple|hide|only|content|media)|(hide|only|skip|suppress).*(embed|link|media)|linkCount|onlyLinks|simpleEmbed|isEmbedInline|hideContent/i

function keysOf(v: any): string {
	try {
		return v && (typeof v === 'object' || typeof v === 'function') ? Object.keys(v).join(',') : String(v)
	} catch (e: any) {
		return `<err ${e?.message ?? e}>`
	}
}

const MAX_ID = 40000

/** Walks module ids through the metro helpers and scans the exports of the initialised ones. */
function scanMetro(lines: string[]) {
	const metro: any = (valenced as any).modules?.metro
	if (typeof metro?.isModuleInitialized !== 'function' || typeof metro?.getInitializedModuleExports !== 'function') {
		lines.push(`metro helpers missing: ${keysOf(metro)}`)
		return
	}

	let initialised = 0
	let found = 0
	for (let id = 0; id < MAX_ID; id++) {
		let exports: any
		try {
			if (!metro.isModuleInitialized(id)) continue
			exports = metro.getInitializedModuleExports(id)
		} catch {
			continue
		}
		if (!exports || (typeof exports !== 'object' && typeof exports !== 'function')) continue
		initialised++
		let count = 0
		try {
			count = Object.keys(exports).length
		} catch {}
		if (count > 80) continue

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
				if ((NAME_HINT.test(k) || NAME_HINT.test(name)) && found < 24) {
					found++
					lines.push(`${id}: ${root === exports ? '' : 'default.'}${k}${name && name !== k ? `(${name})` : ''} [${ks.length}k]`)
				}
			}
		}
	}
	lines.unshift(`initialised modules with exports: ${initialised}`)
}

function scan(): string {
	const lines: string[] = []
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
			;(valenced.react as any).ReactNative?.Alert?.alert('Show Images Link 0.3.6', report)
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
