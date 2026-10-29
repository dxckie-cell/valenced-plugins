import { getModules } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import { before } from '@valenced/patcher'
import * as React from 'react'
import PinsPane, { getWrappedContext } from '../ui/PinsPane'

/**
 * Adds the Server pins / Local pins switch to the channel info Pins tab. Component names aren't
 * reliable (Discord 349+ minifies them), so intercept element creation: any element with props
 * { tab: "pins", searchContext: { channelId } } is swapped for a wrapper that renders the
 * original inside our switch.
 */
export default function patchPinsTab(): () => void {
	const wrappers = new WeakMap<any, any>()

	const wrapperFor = (type: any) => {
		let W = wrappers.get(type)
		if (!W) {
			W = ({ __localPins, ...props }: any) => {
				const inner = React.createElement(type, { ...props, __localPins: true })
				// nested components get the same props: only the outermost one adds the switch
				if (React.useContext(getWrappedContext())) return inner
				return React.createElement(PinsPane, { ret: inner })
			}
			wrappers.set(type, W)
		}
		return W
	}

	const intercept = (args: any[]) => {
		try {
			const [type, props, ...rest] = args
			if (
				typeof type !== 'string' && type && props && !props.__localPins && props.tab === 'pins'
				&& typeof (props.searchContext?.channelId ?? props.channelId) === 'string'
			)
				return [wrapperFor(type), props, ...rest]
		} catch {}
		return args // a before-hook must return the args
	}

	const unpatches: Array<() => void> = []
	const safePatch = (obj: any, key: string) => {
		try {
			unpatches.push(before(obj, key, intercept))
		} catch {}
	}

	safePatch(React, 'createElement')
	const unsub = getModules(withProps('jsx', 'jsxs'), (mod: any) => {
		const target = mod?.jsx ? mod : mod?.default
		for (const k of ['jsx', 'jsxs', 'jsxDEV']) if (typeof target?.[k] === 'function') safePatch(target, k)
	})

	return () => {
		try {
			;(unsub as any)?.()
		} catch {}
		for (const u of unpatches) {
			try {
				u()
			} catch {}
		}
	}
}
