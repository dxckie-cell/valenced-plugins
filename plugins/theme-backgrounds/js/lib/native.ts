import { callNativeMethod, callNativeMethodSync } from '@valenced/modules/native'

/** The same setting as Settings, Themes, Colors, Background. `null` goes back to the color theme's own background. */
export interface BackgroundOverride {
	source: 'custom'
	path: string
	opacity: number
	blur: number
	dimming: number
}

// The Themes API only lets plugins add themes, so the override is written through its native bridge,
// like the built-in Background screen does. Its in-memory copy is only read at startup, so a reload applies it.
export function writeBackground(settings: BackgroundOverride | null) {
	return callNativeMethod('valenced.themes.setBackground', [settings && JSON.stringify(settings)])
}

/** Path of the background override that is set right now, if any. */
export function currentBackgroundPath(): string | undefined {
	try {
		const state = JSON.parse(callNativeMethodSync('valenced.themes.getState', []))
		return state.background?.source === 'custom' ? state.background.path : undefined
	} catch {
		return undefined
	}
}

declare module '@valenced/modules/native' {
	interface NativeMethods {
		'valenced.themes.getState': [[], string]
		'valenced.themes.setBackground': [[json: string | null], null]
	}
}

/** True when a custom background override is set right now. */
export function hasCustomBackground() {
	return currentBackgroundPath() !== undefined
}
