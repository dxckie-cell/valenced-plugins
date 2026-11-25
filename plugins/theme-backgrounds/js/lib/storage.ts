export interface Background {
	id: string
	name: string
	/** Link to the image. Uploads from the phone become catbox.moe links. */
	url: string
	/** Size of the original image in pixels. */
	width: number
	height: number
	/** 1 fills the screen with the image, 3 shows a third of it. */
	zoom: number
	/** Centre of the visible part, 0 to 1 across the image. */
	x: number
	y: number
	opacity: number
	blur: number
	dimming: number
	/** Taken by shuffle. Images saved before this option existed count as included. */
	inShuffle?: boolean
}

export interface Storage {
	backgrounds: Background[]
	/** Pick another saved image each time the app starts. */
	shuffle?: boolean
	/** Writes each themed layer's flags and size on it, to tell the server header's apart. */
	debug?: boolean
}

export const DEFAULTS: Storage = { backgrounds: [], shuffle: false }

/** The look a new image starts with, and what Reset goes back to. */
export const DEFAULT_LOOK = { opacity: 1, blur: 0, dimming: 0.7 }

export const newBackground = (url: string, width: number, height: number): Background => ({
	id: Date.now().toString(36),
	name: 'My background',
	url,
	width,
	height,
	zoom: 1,
	x: 0.5,
	y: 0.5,
	...DEFAULT_LOOK,
})
