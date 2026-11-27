import * as native from '@valenced/modules/native'

export interface MahiroSettings {
	show: boolean
	/** Pet size in dp. */
	sizeDp: number
	/** Movement speed in percent. */
	speed: number
	haptics: boolean
}

export const DEFAULTS: MahiroSettings = { show: true, sizeDp: 96, speed: 100, haptics: true }

/** Native owns the settings (Mahiro has to start before JS is loaded). */
export function callNative(name: string, args: unknown[] = []): Promise<any> {
	return (native as any).callNativeMethod(`dxckie.mahiro-oyama.${name}`, args)
}
