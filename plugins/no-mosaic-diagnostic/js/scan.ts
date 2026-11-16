// Finds Discord modules that look related to the media grid ("mosaic") and records which props they
// are called with. The report holds key names only, never prop values, so it is safe to paste.

const NAME = /mosaic|media.?grid|image.?grid|collage|visual.?media|media.?layout|attachment/i
const MAX_LINES = 200

type Before = (parent: any, key: string, hook: (args: any[]) => any[]) => () => void

export const report: string[] = []
const seen = new WeakSet<object>()

const add = (line: string) => {
	if (report.length < MAX_LINES) report.push(line.slice(0, 300))
}

const keys = (o: any, limit: number): string[] => {
	try {
		return Object.keys(o).slice(0, limit)
	} catch {
		return []
	}
}

// The prop names, plus the names one level down: `item{type,uniqueId}`.
const shape = (props: any): string => {
	if (!props || typeof props !== 'object') return typeof props
	return keys(props, 30)
		.map(k => {
			try {
				const v = props[k]
				return v && typeof v === 'object' && !Array.isArray(v) ? `${k}{${keys(v, 8)}}` : k
			} catch {
				return k
			}
		})
		.join(',')
}

const nameOf = (v: any): string => {
	try {
		return v?.displayName || v?.name || v?.type?.displayName || v?.type?.name || v?.render?.name || ''
	} catch {
		return ''
	}
}

export function scanModule(id: number | string, exports: any, before: Before, cleanup: (fn: () => void) => void) {
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
			const name = nameOf(value)
			if (!NAME.test(key) && !NAME.test(name)) continue

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
			add(`FOUND ${label} ${typeof value}${target ? '' : ' (not hooked)'}`)
			if (!target) continue

			let done = false
			try {
				cleanup(
					// A before hook must hand the arguments back, or the original function is called with none.
					before(target[0], target[1], args => {
						if (!done) {
							done = true
							add(`CALL ${label}: ${shape(args[0])}`)
						}
						return args
					}),
				)
			} catch {}
		}
	}
}
