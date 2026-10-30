// Show Images Link for Valenced: keeps the link text visible when a message is just a linked image.
//
// Vencord's ImageLink patches a small util module (it holds { linkCount: 0, onlyLinks: false }) so
// that "embed type is simple and embed is inline" is never true; Discord then never hides the link.
// 0.3.3 only looks for that module in the running app: it lists the finder API and exports whose
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

/** Runs a plain filter over every loaded module through Valenced's finders. */
function scanWithFinders(lines: string[]) {
	const finders: any = (valenced as any).modules?.finders
	const names = ['lookupModules', 'lookupAllModules', 'lookupModule']
	const fn = names.find((n) => typeof finders?.[n] === 'function')
	if (!fn) {
		lines.push('no lookup function on finders')
		return
	}

	let tested = 0
	const matches: string[] = []
	const filter = (exports: any, id: any) => {
		tested++
		try {
			if (!exports || (typeof exports !== 'object' && typeof exports !== 'function')) return false
			for (const root of [exports, exports.default]) {
				if (!root || (typeof root !== 'object' && typeof root !== 'function')) continue
				for (const k of Object.keys(root)) {
					let name = ''
					try {
						name = typeof root[k] === 'function' ? root[k].name || '' : ''
					} catch {}
					if ((NAME_HINT.test(k) || NAME_HINT.test(name)) && matches.length < 18) {
						matches.push(`${id}: ${root === exports ? '' : 'default.'}${k}${name && name !== k ? `(${name})` : ''}`)
					}
				}
			}
		} catch {}
		return false
	}

	const result = finders[fn](filter)
	if (result && typeof result[Symbol.iterator] === 'function') for (const _ of result) break
	lines.push(`used finders.${fn}, tested ${tested}`, ...matches)
}

function scan(): string {
	const v: any = valenced
	const lines: string[] = [
		`valenced: ${keysOf(v)}`,
		`modules: ${keysOf(v.modules)}`,
		`finders: ${keysOf(v.modules?.finders)}`,
		`filters: ${keysOf(v.modules?.finders?.filters)}`,
		`discord.utils.modules: ${keysOf(v.discord?.utils?.modules)}`,
	]
	try {
		scanWithFinders(lines)
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
			;(valenced.react as any).ReactNative?.Alert?.alert('Show Images Link 0.3.3', report)
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
