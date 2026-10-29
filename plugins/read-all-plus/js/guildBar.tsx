import { getModules } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import {
	getInitializedModuleExports,
	isModuleExportBad,
	onAnyModuleInitialized,
} from '@valenced/modules/metro'
import { after, before } from '@valenced/patcher'
import * as React from 'react'
import { View } from 'react-native'
import ReadButton, { FOOTER_EXTRA } from './readButton'

// Refs returned by the guild bar hook. The list element that uses one of them is the guild bar list.
const guildsBarRefs = new Set<any>()

// Discord has renamed this hook before, so match any guild bar style hook.
const HOOK = /^use\w*guild\w*(bar|list|rail|nav)/i

/**
 * Adds the Read All button below the native buttons in the guild bar footer.
 * Takes either the hook's return value (older Discord) or the list's props.
 */
function patchFooter(patched: WeakSet<object>, target: any) {
	const props = target?.listDataProps ?? (target?.footerSize && target?.renderFooter ? target : undefined)
	if (!props || patched.has(props)) return
	if (typeof props.footerSize !== 'function' || typeof props.renderFooter !== 'function') return

	const { footerSize, renderFooter } = props
	try {
		props.footerSize = () => footerSize.call(props) + FOOTER_EXTRA
		props.renderFooter = () => (
			<View style={{ alignSelf: 'stretch' }} collapsable={false}>
				{renderFooter.call(props)}
				<ReadButton />
			</View>
		)
		patched.add(props)
	} catch {}
}

/** Patches the guild bar hooks found on one module's exports. Returns how many were patched. */
function patchExports(
	exports: any,
	seen: WeakSet<object>,
	patched: WeakSet<object>,
	unpatches: (() => void)[],
): number {
	if (!exports || (typeof exports !== 'object' && typeof exports !== 'function') || seen.has(exports)) return 0
	seen.add(exports)

	let count = 0
	let keys: string[]
	try {
		keys = [...new Set(['default', ...Object.keys(exports)])]
	} catch {
		return 0
	}

	for (const key of keys) {
		// Only read values for "default" or hook-like names, to avoid touching lazy getters.
		let fn: any
		try {
			fn = key === 'default' || HOOK.test(key) ? exports[key] : undefined
		} catch {
			continue
		}
		if (typeof fn !== 'function' || !HOOK.test(fn.name || key) || isModuleExportBad(fn)) continue

		try {
			unpatches.push(
				after(exports, key, (ret: any) => {
					if (ret?.fastListRef) guildsBarRefs.add(ret.fastListRef)
					if (ret?.scrollerRef && typeof ret.scrollerRef === 'object') guildsBarRefs.add(ret.scrollerRef)
					patchFooter(patched, ret)
					return ret
				}),
			)
			count++
		} catch {}
	}

	return count
}

/** Every module id Metro knows about (the registry is a plain object or a Map, depending on the build). */
function moduleIds(): number[] {
	const registry = (globalThis as any).modules
	if (!registry) return []
	try {
		if (registry instanceof Map) return [...registry.keys()].map(Number)
		return Object.keys(registry).map(Number)
	} catch {
		return []
	}
}

export default function patchGuildBar(): () => void {
	const unpatches: (() => void)[] = []
	const seen = new WeakSet<object>()
	const patched = new WeakSet<object>()

	// Runs for every element Discord creates, but only touches the guild bar list (matched by ref).
	const intercept = (args: any[]) => {
		try {
			const props = args?.[1]
			if (props?.ref && guildsBarRefs.has(props.ref)) patchFooter(patched, props)
		} catch {}
		return args // a before-hook must return the args
	}

	const safePatch = (obj: any, key: string) => {
		try {
			unpatches.push(before(obj, key, intercept))
		} catch {}
	}

	safePatch(React, 'createElement')
	const stopRuntime = getModules(withProps('jsx', 'jsxs'), (mod: any) => {
		const target = mod?.jsx ? mod : mod?.default
		for (const k of ['jsx', 'jsxs', 'jsxDEV']) if (typeof target?.[k] === 'function') safePatch(target, k)
	})

	// Modules Discord already loaded...
	for (const id of moduleIds()) {
		let exports: any
		try {
			exports = getInitializedModuleExports(id)
		} catch {
			continue
		}
		patchExports(exports, seen, patched, unpatches)
	}

	// ...and the ones it loads later.
	const stopInit = onAnyModuleInitialized((_id, exports) => {
		patchExports(exports, seen, patched, unpatches)
	})

	return () => {
		for (const stop of [stopRuntime, stopInit]) {
			try {
				;(stop as any)?.()
			} catch {}
		}
		for (const unpatch of unpatches) {
			try {
				unpatch()
			} catch {}
		}
		guildsBarRefs.clear()
	}
}
