export interface View {
	width: number
	height: number
	zoom: number
	x: number
	y: number
}

export interface Rect {
	left: number
	top: number
	width: number
	height: number
}

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max)

/** Part of the image, in image pixels, that fills a screen of the given width / height ratio. */
export function cropRect({ width, height, zoom, x, y }: View, aspect: number): Rect {
	let w = width
	let h = width / aspect
	if (h > height) {
		h = height
		w = height * aspect
	}
	w /= zoom
	h /= zoom
	return {
		left: clamp(x * width - w / 2, 0, width - w),
		top: clamp(y * height - h / 2, 0, height - h),
		width: w,
		height: h,
	}
}

/** Centre of a rect as 0 to 1 positions, so dragging past the edge never stores a hidden offset. */
export const centreOf = (view: View, rect: Rect) => ({
	x: (rect.left + rect.width / 2) / view.width,
	y: (rect.top + rect.height / 2) / view.height,
})

const MAX_WIDTH = 1440

/**
 * Link to the cropped image.
 * wsrv.nl crops after it resizes, so the image is shrunk first and the rect scaled to match.
 */
export function croppedUrl(view: View & { url: string }, aspect: number): string {
	const rect = cropRect(view, aspect)
	const s = Math.min(1, MAX_WIDTH / rect.width)
	const resizedWidth = Math.round(view.width * s)
	const resizedHeight = Math.round(view.height * s)
	const cx = Math.min(Math.round(rect.left * s), resizedWidth - 1)
	const cy = Math.min(Math.round(rect.top * s), resizedHeight - 1)
	const cw = Math.min(Math.round(rect.width * s), resizedWidth - cx)
	const ch = Math.min(Math.round(rect.height * s), resizedHeight - cy)
	return `https://wsrv.nl/?url=${encodeURIComponent(view.url)}&w=${resizedWidth}&cx=${cx}&cy=${cy}&cw=${cw}&ch=${ch}&output=jpg&q=88`
}
