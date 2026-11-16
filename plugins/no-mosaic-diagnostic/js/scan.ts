// Finds Discord modules that look related to the media grid ("mosaic") and records what they are called
// with and what they return. The report holds key names only, plus short values of keys like `type`,
// never message content, so it is safe to paste.

const NAME = /mosaic|media.?grid|image.?grid|collage|visual.?media|media.?layout|attachment/i
const LAYOUT =
	/media.{0,12}(item|row|group|layout|gallery|list|wrapper|container|pool|cell|tile)|(gallery|layout|tile|pool|row|group).{0,12}media|multi.?(image|media|photo)|image.?(row|list|gallery|group)|message.?(media|image|video)/i
const ENUM_KEY = /^(type|kind|layout|variant|mode|content_type)$/
// A module with one of these exports gets all of its export names listed, to find its neighbours.
const NEIGHBORS = /mosaic|media.?item|transform.?message|gap.?width/i
const MAX_LINES = 300
const MAX_LINE = 1500
// Per function: record up to 4 different shapes, and only while the first 300 calls are happening.
const MAX_SHAPES = 4
const MAX_CALLS = 300

type Patcher = {
	before: (parent: any, key: string, hook: (args: any[]) => any[]) => () => void
	after: (parent: any, key: string, hook: (result: any) => any) => () => void
}

export const report: string[] = []
const seen = new WeakSet<object>()

const add = (line: string) => {
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
	return keys(v, 30)
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
			if (!target) continue

			let calls = 0
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
						return args
					}),
				)
				cleanup(
					patcher.after(target[0], target[1], result => {
						record('RETURN', result)
						return result
					}),
				)
			} catch {}
		}
	}
}
