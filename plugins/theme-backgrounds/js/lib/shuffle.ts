import { Dimensions } from 'react-native'
import { croppedUrl } from './crop'
import { currentBackgroundPath, writeBackground } from './native'
import type { Background } from './storage'

/** The link Discord gets for this image, cropped to the screen. */
export const urlOf = (bg: Background) => {
	const { width, height } = Dimensions.get('window')
	return croppedUrl(bg, width / height)
}

export const settingsOf = (bg: Background) => ({
	source: 'custom' as const,
	path: urlOf(bg),
	opacity: bg.opacity,
	blur: bg.blur,
	dimming: bg.dimming,
})

/**
 * Chooses a different saved image than the one in use and stores it as the background.
 * Discord reads the background only at startup, so the new image shows from the next start.
 * Does nothing when the image in use is not one of these, so "Go back to my theme's background" stays.
 */
export async function shuffleBackground(list: Background[]) {
	const current = currentBackgroundPath()
	if (!list.some(b => urlOf(b) === current)) return
	const others = list.filter(b => b.inShuffle !== false && urlOf(b) !== current)
	if (!others.length) return
	return writeBackground(settingsOf(others[Math.floor(Math.random() * others.length)]!))
}
