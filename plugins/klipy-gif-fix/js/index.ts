/*
 * Port of dxckie-cell's Klipy Gif Fix (Vendetta/Revenge), which is the Klipy counterpart of
 * Tenor Gif Fix by nexpid (https://github.com/nexpid/RevengePlugins, CC BY 4.0).
 *
 * Saving or sharing a Klipy GIF gives an .mp4. When a save / download / share function is called
 * with a Klipy video, the real .gif is looked up through the Klipy API and swapped in.
 * If anything fails, the call goes through unchanged, so a save is never blocked.
 */

import { ToastActionCreators } from '@valenced/discord/actions'
import { Stores } from '@valenced/discord/flux'
import { getModules, lookupModule } from '@valenced/modules/finders'
import {
	createFilterGenerator,
	FilterScopes,
	withProps,
} from '@valenced/modules/finders/filters'
import { isModuleExportBad } from '@valenced/modules/metro'
import { instead } from '@valenced/patcher'
import { NativeModules } from 'react-native'
import { API_KEY } from './state'

type Cleanup = () => void
type Fn = (...args: any[]) => any

const NAME_RE =
	/^(download|save|share)\w*(media|asset|image|video|gallery|file|gif|attachment|camera)\w*$/i
const KLIPY = /klipy\.com/i
const VIDEO_EXT = /\.(mp4|webm|mov)(?=$|\?)/i
// Klipy answers missing .gif files with a "content no longer available" placeholder of this size.
const PLACEHOLDER_SIZE = 78534
// Discord proxy links: https://images-ext-1.discordapp.net/external/<signature>/https/static.klipy.com/...
const PROXY_RE =
	/^https?:\/\/[^/]*discord(?:app)?\.(?:net|com)\/external\/[^/]+\/(https?)\/(.+)$/i
const RANK: Record<string, number> = { hd: 0, md: 1, sm: 2, xs: 3 }

/** Klipy page of each embedded video, by the video's file name. */
const pages = new Map<string, string>()

const unwrap = (u: string) => {
	const m = PROXY_RE.exec(u)
	return m ? `${m[1]}://${m[2].split('?')[0]}` : u.split('?')[0]
}
const fname = (u: string) => unwrap(u).split('/').pop() as string

const withTimeout = <T>(p: Promise<T>, ms: number, fallback: T) =>
	Promise.race([p, new Promise<T>(res => setTimeout(() => res(fallback), ms))])

// ---------- remember which Klipy page each embedded video belongs to ----------

function indexMessage(m: any) {
	if (!m || !Array.isArray(m.embeds)) return
	for (const e of m.embeds) {
		if (!e || typeof e.url !== 'string' || !KLIPY.test(e.url)) continue
		const v = e.video || {}
		for (const u of [v.url, v.proxyURL, v.proxy_url]) {
			if (typeof u === 'string' && KLIPY.test(u)) pages.set(fname(u), e.url)
		}
	}
}

function scanCurrentChannel() {
	try {
		const MS = Stores.MessageStore as any
		const id = (Stores.SelectedChannelStore as any)?.getChannelId?.()
		const msgs = id && MS?.getMessages?.(id)
		const list = msgs && (msgs.toArray ? msgs.toArray() : msgs._array)
		if (list) list.forEach(indexMessage)
	} catch {}
}

// ---------- find the real GIF through the Klipy API ----------

function collectGifs(
	obj: unknown,
	path: string,
	out: { url: string; path: string }[],
	depth: number,
) {
	if (depth > 8 || obj == null) return
	if (typeof obj === 'string') {
		if (/^https?:\/\/.+\.gif(\?|$)/i.test(obj)) out.push({ url: obj, path })
	} else if (typeof obj === 'object') {
		for (const k of Object.keys(obj as object))
			collectGifs((obj as any)[k], `${path}.${k}`, out, depth + 1)
	}
}

function apiGifs(page: string, dir: string, key: string): Promise<string[]> {
	const m = /klipy\.com\/(gifs|stickers|memes|clips)\/([^/?#]+)/i.exec(page)
	if (!m) return Promise.resolve([])
	const url = `https://api.klipy.com/api/v1/${encodeURIComponent(key)}/${m[1].toLowerCase()}/${encodeURIComponent(m[2])}`
	const req = fetch(url, { headers: { Accept: 'application/json' } })
		.then(r => r.text())
		.then(text => {
			const found: { url: string; path: string }[] = []
			try {
				collectGifs(JSON.parse(text), '', found, 0)
			} catch {}
			const score = (f: { url: string; path: string }) => {
				const size = (/\.(hd|md|sm|xs)\b/.exec(f.path) || [])[1]
				return (
					(dir && f.url.includes(dir) ? 0 : 10) +
					(size && size in RANK ? RANK[size] : 5)
				)
			}
			found.sort((a, b) => score(a) - score(b))
			const urls: string[] = []
			for (const f of found) if (!urls.includes(f.url)) urls.push(f.url)
			return urls.slice(0, 6)
		})
		.catch(() => [] as string[])
	return withTimeout(req, 10000, [] as string[])
}

/** Whether the link really is a GIF, and not Klipy's "content no longer available" placeholder. */
function probe(url: string): Promise<boolean> {
	const req = fetch(url, { method: 'GET', headers: { Range: 'bytes=0-0' } })
		.then(r => {
			const range = r.headers.get('content-range')
			const size = range
				? Number.parseInt(range.split('/')[1], 10)
				: Number.parseInt(r.headers.get('content-length') || '0', 10)
			return (
				(r.status === 200 || r.status === 206) &&
				/image\/gif/i.test(r.headers.get('content-type') || '') &&
				size !== PLACEHOLDER_SIZE
			)
		})
		.catch(() => false)
	return withTimeout(req, 6000, false)
}

/** When a Klipy video was last swapped for its GIF: the "saved" toast that follows is for a GIF. */
let lastSwap = 0
const TOAST_WINDOW = 30_000

async function resolveGif(mp4: string): Promise<string | null> {
	const name = fname(mp4)
	if (!pages.has(name)) scanCurrentChannel()
	const page = pages.get(name)
	if (!page) return null
	const dir = (unwrap(mp4).split('klipy.com/')[1] || '').replace(/[^/]+$/, '')
	const urls = await apiGifs(page, dir, API_KEY)
	const ok = await Promise.all(urls.map(probe))
	for (let i = 0; i < urls.length; i++) {
		if (ok[i]) {
			lastSwap = Date.now()
			return urls[i]
		}
	}
	return null
}

// ---------- argument rewriting ----------

function findKlipyVideo(args: unknown[]): string | null {
	const look = (v: unknown, d: number): string | null => {
		if (typeof v === 'string')
			return KLIPY.test(v) && VIDEO_EXT.test(v) ? v : null
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
	() => 'klipy-gif-fix.save',
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
					mp4 = findKlipyVideo(args)
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

// ---------- remember Klipy pages from incoming messages ----------

function watchMessages(cleanup: (fn: Cleanup) => void) {
	const [dispatcher] = lookupModule(
		withProps('dispatch', 'subscribe', 'wait'),
	) as unknown as [any]
	if (!dispatcher?.subscribe)
		throw new Error("couldn't find Discord's dispatcher")

	const handlers: Record<string, (e: any) => void> = {
		MESSAGE_CREATE: e => e?.message && indexMessage(e.message),
		MESSAGE_UPDATE: e => e?.message && indexMessage(e.message),
		LOAD_MESSAGES_SUCCESS: e =>
			Array.isArray(e?.messages) && e.messages.forEach(indexMessage),
	}
	for (const [event, handler] of Object.entries(handlers)) {
		dispatcher.subscribe(event, handler)
		cleanup(() => dispatcher.unsubscribe(event, handler))
	}
}

export default plugin({
	start({ cleanup, plugin }) {
		cleanup(() => pages.clear())

		// a failing step (Discord changed something) must not stop the other
		for (const step of [
			watchMessages,
			scanCurrentChannel,
			patchSaves,
			patchToast,
		]) {
			try {
				step(cleanup)
			} catch (e) {
				plugin.reportError(e)
			}
		}
	},
})
