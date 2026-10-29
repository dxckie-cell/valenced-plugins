import { lookupModuleWithImportedPath } from '@valenced/discord/utils/modules/finders'

/**
 * Calls `onModule` with the exports of a Discord module once it is initialized and `isReady` passes.
 *
 * While Discord is starting, modules show up before their exports are filled in, and the "module loaded"
 * notification can arrive too early, so the module is simply looked up again every 200ms (for up to 2 minutes).
 * Returns a function that cancels the lookup.
 */
export function withModule<T = any>(
	path: string,
	isReady: (mod: T) => boolean,
	onModule: (mod: T) => void,
): () => void {
	let timer: ReturnType<typeof setTimeout> | undefined
	let cancelled = false

	const attempt = (tries: number) => {
		if (cancelled) return

		try {
			const found = lookupModuleWithImportedPath(path) as any
			if (Array.isArray(found)) {
				const mod = (found[0]?.default ?? found[0]) as T
				if (mod && isReady(mod)) return onModule(mod)
			}
		} catch {
			// not ready yet
		}

		if (tries >= 600) return
		timer = setTimeout(() => attempt(tries + 1), 200)
	}

	attempt(0)

	return () => {
		cancelled = true
		if (timer) clearTimeout(timer)
	}
}
