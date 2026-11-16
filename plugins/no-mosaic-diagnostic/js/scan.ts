// Finds Discord modules that look related to the media grid ("mosaic") and records what they are called
// with and what they return. The report holds key names only, plus short values of keys like `type`,
// never message content, so it is safe to paste.

const NAME =
	/mosaic|media.?grid|image.?grid|collage|visual.?media|media.?layout|attachment|generate.?message.?row|create.?message.?content|message.?row.?data/i
const LAYOUT =
	/media.{0,12}(item|row|group|layout|gallery|list|wrapper|container|pool|cell|tile)|(gallery|layout|tile|pool|row|group).{0,12}media|multi.?(image|media|photo)|image.?(row|list|gallery|group)|message.?(media|image|video)/i
const ENUM_KEY = /^(type|kind|layout|variant|mode|content_type|attachmentType)$/
// A module with one of these exports gets all of its export names listed, to find its neighbours.
const NEIGHBORS = /mosaic|media.?item|transform.?message|gap.?width/i
// Already understood from earlier reports. Still listed, no longer hooked, to keep the report short.
const KNOWN =
	/^(messageHasExpiredAttachmentUrl|hasAttachmentsEmbedsComponentsOrSnapshots|hasMessageSnapshotsWithAttachmentsOrEmbeds|useInputAttachments|getAttachmentImageLadderConfig|snapAttachmentDimensions|getAttachmentObscurityProps)$/
const MAX_LINES = 500
const MAX_LINE = 4000
// Per function: record up to 4 different shapes, and only while the first 300 calls are happening.
const MAX_SHAPES = 4
const STACKED = /^transformMessageAttachments$/

// Who called us: function names and bundle line:column only, with the file paths cut off.
const callers = (): string => {
	try {
		return String(new Error().stack)
			.split('\n')
			.slice(2, 12)
			.map(l => l.trim().replace(/^at /, '').replace(/(\(|^)[^()\s]*[\\/]/, '$1'))
			.join(' < ')
	} catch {
		return ''
	}
}
const MAX_CALLS = 300

type Patcher = {
	before: (parent: any, key: string, hook: (args: any[]) => any[]) => () => void
	after: (parent: any, key: string, hook: (result: any) => any) => () => void
}

// Keep in step with manifest.json. Shown in the report so it is clear which build produced it.
const VERSION = '0.0.8'

// Proof the probe is alive: hooks installed, elements seen, elements searched, lists remembered.
const stats = { hooks: 0, seen: 0, examined: 0, lists: 0 }
export const header = () => [
	`VERSION ${VERSION}`,
	`PROBE hooks=${stats.hooks} seen=${stats.seen} examined=${stats.examined} lists=${stats.lists}`,
]

export const report: string[] = []
const seen = new WeakSet<object>()

export const add = (line: string) => {
	if (report.length < MAX_LINES) report.push(line.slice(0, MAX_LINE))
}

const keys = (o: any, limit: number): string[] => {
	try {
		return Object.keys(o).slice(0, limit)
	} catch {
		return []
	}
}

// One key of an object: `name`, `name{inner keys}`, or `type=IMAGE` for the few keys whose value is a short label.
const part = (v: any, k: string, depth: number): string => {
	try {
		const x = v[k]
		if (ENUM_KEY.test(k) && typeof x === 'number') return `${k}=${x}`
		if (typeof x === 'string' && ENUM_KEY.test(k) && x.length <= 24 && /^[\w/.-]+$/.test(x)) return `${k}=${x}`
		return x && typeof x === 'object' ? `${k}{${shape(x, depth - 1)}}` : k
	} catch {
		return k
	}
}

// Key names, three levels deep. Arrays show their length and the shape of the first item.
const shape = (v: any, depth = 3): string => {
	if (Array.isArray(v)) return `[${v.length}]${v.length && depth > 0 ? shape(v[0], depth - 1) : ''}`
	if (!v || typeof v !== 'object') return typeof v
	if (depth <= 0) return ''
	return keys(v, 80)
		.map(k => part(v, k, depth))
		.join(',')
}

const nameOf = (v: any): string => {
	try {
		return v?.displayName || v?.name || v?.type?.displayName || v?.type?.name || v?.render?.name || ''
	} catch {
		return ''
	}
}

const interesting = (s: string) => NAME.test(s) || LAYOUT.test(s)

// Export names with their kind: `fn()`, `obj{}`, or `name:n` for number, string, boolean.
const listExports = (root: any): string =>
	keys(root, 60)
		.map(k => {
			try {
				const t = typeof root[k]
				return t === 'function' ? `${k}()` : t === 'object' ? `${k}{}` : `${k}:${t[0]}`
			} catch {
				return k
			}
		})
		.join(',')

const dumped = new Set<string>()

export function scanModule(id: number | string, exports: any, patcher: Patcher, cleanup: (fn: () => void) => void) {
	for (const [prefix, root] of [['', exports], ['default.', exports?.default]] as const) {
		if (!root || (typeof root !== 'object' && typeof root !== 'function') || seen.has(root)) continue
		seen.add(root)

		for (const key of keys(root, 200)) {
			let value: any
			try {
				value = root[key]
			} catch {
				continue
			}
			if (NEIGHBORS.test(key) && !dumped.has(`${id}${prefix}`)) {
				dumped.add(`${id}${prefix}`)
				add(`MODULE #${id} ${prefix || 'exports'}: ${listExports(root)}`)
			}
			const name = nameOf(value)
			if (!interesting(key) && !interesting(name)) continue

			const label = `#${id} ${prefix}${key}${name && name !== key ? ` (${name})` : ''}`
			// Plain functions are hooked directly. Memo and forwardRef components hold the function in `type` or `render`.
			const target: [any, string] | undefined =
				typeof value === 'function'
					? [root, key]
					: typeof value?.type === 'function'
						? [value, 'type']
						: typeof value?.render === 'function'
							? [value, 'render']
							: undefined
			const note = target ? '' : value && typeof value === 'object' ? ` (not hooked) {${keys(value, 15)}}` : ' (not hooked)'
			add(`FOUND ${label} ${typeof value}${note}`)
			if (!target || KNOWN.test(key)) continue

			let calls = 0
			let stacked = false
			const searched = { HOLDS: 0, TAKES: 0 }
			const found = { HOLDS: false, TAKES: false }
			// After transformMessageAttachments has run, does this function take in or hand back those items?
			const holds = (kind: 'HOLDS' | 'TAKES', value: any) => {
				if (found[kind] || !trackedCount || searched[kind]++ >= 50) return
				try {
					const f = findMedia(value)
					if (f?.path) {
						found[kind] = true
						add(`${kind} ${label} at=${f.path}`)
					}
				} catch {}
			}
			const seenShapes = { CALL: new Set<string>(), RETURN: new Set<string>() }
			// Many calls look alike (a message with no attachments), so keep a few different shapes, not just the first.
			const record = (kind: 'CALL' | 'RETURN', value: any) => {
				try {
					if (calls > MAX_CALLS || seenShapes[kind].size >= MAX_SHAPES) return
					const s = shape(value)
					if (seenShapes[kind].has(s)) return
					seenShapes[kind].add(s)
					add(`${kind} ${label}: ${s}`)
				} catch {}
			}
			try {
				// Both hooks must hand their value back unchanged, or the real function breaks.
				cleanup(
					patcher.before(target[0], target[1], args => {
						calls++
						record('CALL', args[0])
						holds('TAKES', args[0])
						if (!stacked && STACKED.test(name) && args[0]?.attachments?.length > 1) {
							stacked = true
							add(`STACK ${label}: ${callers()}`)
						}
						return args
					}),
				)
				cleanup(
					patcher.after(target[0], target[1], result => {
						record('RETURN', result)
						trackResult(result)
						holds('HOLDS', result)
						return result
					}),
				)
			} catch {}
		}
	}
}

// ---------------------------------------------------------------------------------------------
// Element probe: finds the React component that is handed the media items returned by
// transformMessageAttachments. That list sits inside a message row, several levels down, so the
// probe remembers the returned objects by identity and searches element props for them.
// ---------------------------------------------------------------------------------------------

const MAX_HITS = 8
const MAX_ELEMENTS = 60000 // elements examined once items exist, then the probe stops itself
const NODE_BUDGET = 250 // objects visited per element
const MAX_DEPTH = 6

const tracked = new WeakSet<object>()
let trackedCount = 0

// A media item as transformMessageAttachments returns it. Also matches copies of the real ones.
const isItem = (v: any): boolean => {
	try {
		return !!v && typeof v === 'object' && 'attachmentType' in v && 'url' in v
	} catch {
		return false
	}
}

export function trackResult(result: any) {
	try {
		if (!Array.isArray(result) || !isItem(result[0])) return
		tracked.add(result)
		trackedCount++
		stats.lists++
		for (const item of result) if (item && typeof item === 'object') tracked.add(item)
	} catch {}
}

// Looks for a remembered object, or one shaped like a media item, in an element's props.
// Skips style and does not enter nested React elements, which report themselves.
const findMedia = (props: any): { path: string; value: any } | undefined => {
	let budget = NODE_BUDGET
	const visited = new WeakSet<object>()
	const walk = (v: any, path: string, depth: number): { path: string; value: any } | undefined => {
		if (!v || typeof v !== 'object' || visited.has(v) || --budget < 0) return
		visited.add(v)
		if (tracked.has(v) || isItem(v)) return { path, value: v }
		if (depth <= 0 || '$$typeof' in v) return
		const ks = Array.isArray(v) ? [0, 1, 2].filter(i => i < v.length).map(String) : keys(v, 80)
		for (const k of ks) {
			if (k === 'style') continue
			let child: any
			try {
				child = v[k]
			} catch {
				continue
			}
			const found = walk(child, Array.isArray(v) ? `${path}[${k}]` : path ? `${path}.${k}` : k, depth - 1)
			if (found) return found
		}
	}
	return walk(props, '', MAX_DEPTH)
}

// Where the component's code is in the bundle, like the line:column in a stack trace.
const where = (type: any): string => {
	try {
		const fn = typeof type === 'function' ? type : (type?.type ?? type?.render)
		const l = (globalThis as any).HermesInternal?.getFunctionLocation?.(fn)
		return l ? `@${l.lineNumber}:${l.columnNumber}` : ''
	} catch {
		return ''
	}
}

export function probeElement(el: any, onHit: (type: any, line: string) => void) {
	try {
		if (!trackedCount) return
		const type = el?.type
		const props = el?.props
		if (!type || typeof type === 'string' || !props || typeof props !== 'object') return
		const found = findMedia(props)
		if (!found) return
		onHit(type, `${nameOf(type) || '(anonymous)'}${where(type)} at=${found.path} found{${shape(found.value, 2)}} props{${shape(props, 2)}}`)
	} catch {}
}

// Which module exports this component, so it can be patched later.
export function locateExport(type: any, metro: any): string {
	const wanted = [type, type?.type, type?.render].filter(Boolean)
	for (let id = 0; id < 40000; id++) {
		try {
			if (!metro.isModuleInitialized(id)) continue
			const exports = metro.getInitializedModuleExports(id)
			for (const [prefix, root] of [['', exports], ['default.', exports?.default]] as const) {
				if (!root || (typeof root !== 'object' && typeof root !== 'function')) continue
				if (wanted.includes(root)) return `#${id} ${prefix ? 'default' : 'module.exports'}`
				for (const k of keys(root, 300)) {
					const v = root[k]
					if (wanted.includes(v) || wanted.includes(v?.type)) return `#${id} ${prefix}${k}`
				}
			}
		} catch {}
	}
	return 'not found as an export'
}

export function startElementProbe(
	targets: [any, string][],
	patcher: Patcher,
	metro: any,
	cleanup: (fn: () => void) => void,
) {
	const hits = new Set<string>()
	const stops: (() => void)[] = []
	const stopAll = () => {
		for (const stop of stops) {
			try {
				stop()
			} catch {}
		}
	}
	// This runs for every element React creates, so it must return the element untouched and never throw.
	const onElement = (el: any) => {
		stats.seen++
		if (trackedCount && ++stats.examined > MAX_ELEMENTS) {
			setTimeout(stopAll, 0)
			return el
		}
		probeElement(el, (type, line) => {
			const id = line.split(' found{')[0]
			// The stop below runs on a timer, so a burst of renders could pass the cap before it fires.
			if (hits.has(id) || hits.size >= MAX_HITS) return
			hits.add(id)
			add(`JSX ${line}`)
			setTimeout(() => add(`LOCATE ${id}: ${locateExport(type, metro)}`), 0)
			if (hits.size >= MAX_HITS) setTimeout(stopAll, 0)
		})
		return el
	}
	for (const [parent, key] of targets) {
		try {
			const stop = patcher.after(parent, key, onElement)
			stats.hooks++
			stops.push(stop)
			cleanup(stop)
		} catch {}
	}
}
