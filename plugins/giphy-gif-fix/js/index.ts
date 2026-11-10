/*
 * Giphy counterpart of Klipy Gif Fix, which is based on Tenor Gif Fix by nexpid
 * (https://github.com/nexpid/RevengePlugins, CC BY 4.0).
 *
 * Saving or sharing a Giphy GIF gives an .mp4. When a save / download / share function is called
 * with a Giphy video, the .gif that sits next to it on Giphy's server is swapped in.
 * If that file can't be found, the call goes through unchanged, so a save is never blocked.
 */

import { ToastActionCreators } from '@valenced/discord/actions'
import { getModules } from '@valenced/modules/finders'
import {
	createFilterGenerator,
	FilterScopes,
} from '@valenced/modules/finders/filters'
import { isModuleExportBad } from '@valenced/modules/metro'
import { instead } from '@valenced/patcher'
import { NativeModules } from 'react-native'

type Cleanup = () => void
type Fn = (...args: any[]) => any

const NAME_RE =
	/^(download|save|share)\w*(media|asset|image|video|gallery|file|gif|attachment|camera)\w*$/i
const GIPHY = /giphy\.com/i
const VIDEO_EXT = /\.(mp4|webm|mov)(?=$|\?)/i
// Discord proxy links: https://images-ext-1.discordapp.net/external/<signature>/https/media.giphy.com/...
const PROXY_RE =
	/^https?:\/\/[^/]*discord(?:app)?\.(?:net|com)\/external\/[^/]+\/(https?)\/(.+)$/i

const unwrap = (u: string) => {
	const m = PROXY_RE.exec(u)
	return m ? `${m[1]}://${m[2].split('?')[0]}` : u.split('?')[0]
}

const withTimeout = <T>(p: Promise<T>, ms: number, fallback: T) =>
	Promise.race([p, new Promise<T>(res => setTimeout(() => res(fallback), ms))])

/** Whether the link really is a GIF. */
function probe(url: string): Promise<boolean> {
	const req = fetch(url, { method: 'GET', headers: { Range: 'bytes=0-0' } })
		.then(
			r =>
				(r.status === 200 || r.status === 206) &&
				/image\/gif/i.test(r.headers.get('content-type') || ''),
		)
		.catch(() => false)
	return withTimeout(req, 6000, false)
}

/** When a Giphy video was last swapped for its GIF: the "saved" toast that follows is for a GIF. */
let lastSwap = 0
const TOAST_WINDOW = 30_000

/** The GIF next to the video: media.giphy.com/media/<id>/giphy.mp4 -> .../giphy.gif */
async function resolveGif(mp4: string): Promise<string | null> {
	const gif = unwrap(mp4).replace(/[^/]+$/, 'giphy.gif')
	if (!(await probe(gif))) return null
	lastSwap = Date.now()
	return gif
}

// ---------- argument rewriting ----------

function findGiphyVideo(args: unknown[]): string | null {
	const look = (v: unknown, d: number): string | null => {
		if (typeof v === 'string')
			return GIPHY.test(v) && VIDEO_EXT.test(v) ? v : null
		if (v && typeof v === 'object' && d < 3) {
			for (const k of Object.keys(v)) {
				const r = look((v as any)[k], d + 1)
				if (r) return r
			}
		}
		return null
	}
	for (const a of args) {
		const r = look(a, 0)
		if (r) return r
	}
	return null
}

function swap(v: any, from: string, to: string, d: number): any {
	if (typeof v === 'string') return v === from ? to : v
	if (Array.isArray(v)) return v.map(x => swap(x, from, to, d + 1))
	if (v && typeof v === 'object' && d < 3) {
		const proto = Object.getPrototypeOf(v)
		if (proto !== Object.prototype && proto !== null) return v
		const o: Record<string, unknown> = {}
		for (const k of Object.keys(v)) o[k] = swap(v[k], from, to, d + 1)
		return o
	}
	return v
}

function buildGifArgs(args: unknown[], mp4: string, gif: string): unknown[] {
	const out = args.map(a => swap(a, mp4, gif, 0))
	for (let i = 0; i < out.length; i++) {
		const a: any = out[i]
		if (typeof a === 'string' && /^video\//i.test(a)) out[i] = 'image/gif'
		else if (typeof a === 'number' && i > 0) out[i] = 0
		else if (a && typeof a === 'object' && !Array.isArray(a)) {
			for (const k of ['contentType', 'mimeType', 'mime', 'type']) {
				if (typeof a[k] === 'string' && /video/i.test(a[k])) a[k] = 'image/gif'
			}
		}
	}
	return out
}

// ---------- patching ----------

/** Names of the save / share functions on an object. */
const saveNames = (holder: unknown): string[] => {
	if (!holder || (typeof holder !== 'object' && typeof holder !== 'function'))
		return []
	try {
		return Object.keys(holder).filter(
			k => NAME_RE.test(k) && typeof (holder as any)[k] === 'function',
		)
	} catch {
		return []
	}
}

/** Modules that export a save / share function, as they load. */
const withSaveFunction = createFilterGenerator<[]>(
	(_args, _id, exports, initialized) => {
		if (!initialized || isModuleExportBad(exports)) return false
		if (typeof exports !== 'object' && typeof exports !== 'function')
			return false
		const own = exports as { default?: unknown }
		return saveNames(exports).length > 0 || saveNames(own.default).length > 0
	},
	() => 'giphy-gif-fix.save',
	FilterScopes.Initialized,
)

function patchSaves(cleanup: (fn: Cleanup) => void) {
	const seen = new Set<string>()

	const hook = (holder: any, key: string, label: string) => {
		const id = `${label}:${key}`
		if (seen.has(id)) return
		seen.add(id)
		cleanup(
			instead(holder, key, function (this: unknown, args: any[], original: Fn) {
				let mp4: string | null = null
				try {
					mp4 = findGiphyVideo(args)
				} catch {}
				if (!mp4) return Reflect.apply(original, this, args)

				const video = mp4
				return resolveGif(video)
					.catch(() => null)
					.then(gif =>
						Reflect.apply(
							original,
							this,
							gif ? buildGifArgs(args, video, gif) : args,
						),
					)
			}),
		)
	}

	let count = 0
	cleanup(
		getModules(withSaveFunction(), exports => {
			const label = `m${count++}`
			for (const holder of [exports, (exports as any).default]) {
				for (const key of saveNames(holder)) hook(holder, key, label)
			}
		}),
	)

	// Native modules, such as the gallery saver
	try {
		for (const modName of Object.keys(NativeModules)) {
			const mod = (NativeModules as Record<string, any>)[modName]
			if (!mod || typeof mod !== 'object') continue
			for (const key of saveNames(mod)) hook(mod, key, `n:${modName}`)
		}
	} catch {}
}

// ---------- "Image Saved" -> "Gif Saved" ----------

const SAVED_TOAST = /saved/i
const TEXT_KEYS = ['text', 'content', 'message', 'title']

/** Rewords "Image Saved" to "Gif Saved" in a toast's options, if a GIF was just saved. */
function rewordToast(options: unknown): unknown {
	if (Date.now() - lastSwap > TOAST_WINDOW) return options
	if (!options || typeof options !== 'object') return options
	const out: Record<string, unknown> = { ...options }
	for (const k of TEXT_KEYS) {
		const v = out[k]
		if (typeof v === 'string' && SAVED_TOAST.test(v) && /image/i.test(v))
			out[k] = v.replace(/image/gi, 'Gif')
	}
	return out
}

function patchToast(cleanup: (fn: Cleanup) => void) {
	cleanup(
		instead(ToastActionCreators, 'open', function (args: any[], original: Fn) {
			try {
				if (args.length > 1)
					args = [args[0], rewordToast(args[1]), ...args.slice(2)]
			} catch {}
			return Reflect.apply(original, this, args)
		}),
	)
}

export default plugin({
	start({ cleanup, plugin }) {
		// a failing step (Discord changed something) must not stop the other
		for (const step of [patchSaves, patchToast]) {
			try {
				step(cleanup)
			} catch (e) {
				plugin.reportError(e)
			}
		}
	},
})
