import { getModules } from '@valenced/modules/finders'
import { withName, withProps } from '@valenced/modules/finders/filters'
import * as metro from '@valenced/modules/metro'
import { instead } from '@valenced/patcher'

type Props = Record<string, any>

let List: ((props: Props) => any) | undefined
let last: Props | undefined

/** Discord's own emoji list and the props it was last rendered with, learned the first time the chat picker opens. */
export const nativePicker = () => (List && last ? { List, props: last } : undefined)

/** Keeps Discord's emoji list and the props it was last rendered with. Our own sheet marks its props __bio, those are skipped. */
export function watchNativePicker(): () => void {
	const stop = getModules(
		withName('EmojiPickerListComponent'),
		(mod: any) => {
			if (typeof mod?.default !== 'function') return
			List = mod.default
			try {
				instead(mod, 'default', function (this: any, args: any[], run: (...a: any[]) => any) {
					if (args[0] && !args[0].__bio) last = args[0]
					return Reflect.apply(run, this, args)
				})
			} catch {}
		},
		{ returnNamespace: true, max: 1 },
	)
	return () => {
		;(stop as any)?.()
		List = last = undefined
	}
}

export interface Saved {
	pickerModuleId?: number | null
}

/** Where the picker's module id is remembered between app starts */
interface Storage {
	getId(): number | undefined
	setId(id: number | null): void
}

let Whole: ((props: Props) => any) | undefined
let storage: Storage | undefined
const isPicker = (c: any) => [c?.displayName, c?.name, c?.type?.displayName, c?.type?.name].includes('EmojiPicker')

// The picker may be the default export, a named one or memo-wrapped, so every export is checked.
function pickIn(exported: any) {
	if (isPicker(exported)) return exported
	for (const key of Object.keys(exported ?? {})) {
		try {
			if (isPicker(exported[key])) return exported[key]
		} catch {}
	}
}

function foundWhole(exported: any, id?: number) {
	const component = pickIn(exported)
	if (!component) return
	Whole = component
	if (id !== undefined && storage?.getId() !== id) storage?.setId(id)
}

/** Reanimated's makeMutable: a real shared value, which Discord's picker needs (look-alikes crash the app). */
export let makeMutable: ((v: number) => any) | undefined

function foundMutable(m: any) {
	const fn = m?.makeMutable ?? m?.default?.makeMutable
	if (typeof fn !== 'function') return
	// Another module also exports a makeMutable (it returns {locale, ast}), only reanimated's gives a shared value.
	try {
		if (fn(0)?._isReanimatedSharedValue) makeMutable = fn
	} catch {}
}

export function findWholePicker(s: Storage): () => void {
	storage = s
	const stops = [
		getModules(withProps('makeMutable'), foundMutable),
		metro.onAnyModuleInitialized((_id: number, exports: any) => {
			try {
				foundMutable(exports)
			} catch {}
		}),
		getModules(withName('EmojiPicker'), foundWhole),
		// withName can miss it, so every module that loads is also checked.
		metro.onAnyModuleInitialized((id: number, exports: any) => {
			try {
				foundWhole(exports, id)
			} catch {}
		}),
	]
	return () => {
		for (const stop of stops) (stop as any)?.()
		Whole = storage = makeMutable = undefined
	}
}

/** Discord's whole emoji picker. It only loads the picker once it is opened in chat, so later app starts load it by its remembered id. */
export function wholePicker(): ((props: Props) => any) | undefined {
	if (Whole) return Whole
	const id = storage?.getId()
	if (id === undefined) return undefined

	try {
		if (!metro.isModuleInitialized(id)) __r(id)
		foundWhole(metro.getInitializedModuleExports(id), id)
	} catch {}

	// Discord updated and its modules moved, so the id is learned again from chat
	if (!Whole) storage?.setId(null)
	return Whole
}
