import { Image } from 'react-native'
import { getOverrides, status } from './state'

// URLs already handed to the image cache, so each one is only requested once.
const requested = new Set<string>()
let failed = 0

// Starts downloading every override banner in the background, so it is already in
// the image cache when a profile opens. Safe to call again after the list changes.
export function prefetchOverrides() {
	const urls = [
		...new Set(
			getOverrides()
				.map(entry => entry?.url?.trim())
				.filter((url): url is string => !!url && /^https?:\/\//i.test(url)),
		),
	].filter(url => !requested.has(url))

	for (const url of urls) {
		requested.add(url)

		try {
			Promise.resolve(Image.prefetch(url)).then(
				() => report(url, true),
				() => report(url, false),
			)
		} catch {
			report(url, false)
		}
	}

	if (urls.length) status('prefetch', `prefetch: started ${urls.length} banner(s)`)
}

function report(url: string, ok: boolean) {
	if (!ok) {
		failed++
		requested.delete(url)
	}
	status('prefetch', `prefetch: ${ok ? 'finished' : 'failed'} ${url.slice(0, 60)}${failed ? ` (${failed} failed)` : ''}`)
}

export function resetPrefetch() {
	requested.clear()
	failed = 0
}

let timer: ReturnType<typeof setTimeout> | undefined

// For settings edits: waits until typing stops, so half-typed URLs are not requested.
export function schedulePrefetch() {
	if (timer) clearTimeout(timer)
	timer = setTimeout(prefetchOverrides, 2000)
}
