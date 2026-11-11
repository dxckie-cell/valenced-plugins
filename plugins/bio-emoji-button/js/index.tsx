import { getModules } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import { before } from '@valenced/patcher'
import * as React from 'react'
import { View } from 'react-native'
import { findWholePicker, watchNativePicker } from './native'
import type { Saved } from './native'
import { EmojiButton, openPicker, type Target } from './picker'

// Set on the input we render ourselves, so it is not wrapped again.
const DONE = '__dxckieBioEmoji'
const BIO = /\b(bio|about me)\b/i

const handlerOf = (props: any) => (typeof props.onChangeText === 'function' ? props.onChangeText : props.onChange)

// The bio box: a multiline field with a length limit. Its label sits outside the box, so
// the text check is only a bonus. Other multiline fields with a limit would match too.
function isBioInput(props: any) {
	if (!props || props[DONE] || typeof handlerOf(props) !== 'function') return false
	if (!('value' in props) || !(props.multiline || props.isMultiline)) return false
	const named = [props.label, props.placeholder, props.accessibilityLabel, props.nativeID, props.testID].some(
		v => typeof v === 'string' && BIO.test(v),
	)
	return named || typeof props.maxLength === 'number'
}

function BioField({ Original, ...props }: Record<string, any>) {
	const target = React.useRef<Target>({})
	target.current = { ...props, onChange: handlerOf(props) }
	return React.createElement(
		View,
		null,
		React.createElement(Original, { ...props, [DONE]: true }),
		React.createElement(EmojiButton, { onPress: () => openPicker(target) }),
	)
}

export default plugin<{ jsonStorage: Saved }>({
	jsonStorage: { load: true, default: {} },
	start({ cleanup, jsonStorage, plugin }) {
		// A screen already open keeps the unpatched input until a restart.
		if (plugin.startedLate) {
			plugin.requireReload()
			return
		}

		cleanup(watchNativePicker())
		cleanup(
			findWholePicker({
				getId: () => {
					const id = (jsonStorage.cache as Saved | undefined)?.pickerModuleId
					return typeof id === 'number' ? id : undefined
				},
				setId: id => jsonStorage.set({ pickerModuleId: id }),
			}),
		)

		const hook = (args: any[]) => {
			try {
				const [type, props] = args
				if (type !== BioField && isBioInput(props))
					return [BioField, { ...props, Original: type }, ...args.slice(2)]
			} catch {}
			return args
		}

		const safe = (obj: any, key: string) => {
			try {
				cleanup(before(obj, key, hook))
			} catch {}
		}

		safe(React, 'createElement')
		cleanup(
			getModules(withProps('jsx', 'jsxs'), (mod: any) => {
				const target = mod?.jsx ? mod : mod?.default
				for (const k of ['jsx', 'jsxs', 'jsxDEV']) if (typeof target?.[k] === 'function') safe(target, k)
			}),
		)
	},

	stop({ plugin }) {
		plugin.requireReload()
	},
})
