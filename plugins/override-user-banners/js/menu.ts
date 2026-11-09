import { ActionSheetActionCreators } from '@valenced/discord/actions'
import { waitForModuleWithImportedPath } from '@valenced/discord/utils/modules/finders'
import { instead } from '@valenced/patcher'
import { withModule } from './modules'
import { getOverrides, type Settings } from './state'
import type { JsonStorage } from '@valenced/json-storage'

const PATH = 'modules/user_profile/native/UserProfileOverflowMenu.tsx'
const LABEL = 'Override Banner'

// The menu's rows are groups of { label, action } passed to the ContextMenu element, so find that list in the returned tree.
function findGroups(node: any, depth = 0): any[][] | undefined {
	if (!node || typeof node !== 'object' || depth > 6) return
	const items = node.props?.items
	if (Array.isArray(items) && Array.isArray(items[0])) return items
	const children = node.props?.children
	for (const child of Array.isArray(children) ? children : [children]) {
		const found = findGroups(child, depth + 1)
		if (found) return found
	}
}

/** Adds "Override Banner" to the "..." menu on a user's profile. */
export function patchMenu(storage: JsonStorage<Settings>, openSettings: () => void): () => void {
	let unpatch: (() => void) | undefined
	const cancels: (() => void)[] = []

	const patch = () =>
		cancels.push(
			withModule(
				PATH,
				(m: any) => typeof m === 'function',
				(_, exports) => {
					if (unpatch) return
					unpatch = instead(exports, 'default', (args: any[], original: any) => {
						const element = original(...args)
						const id = args[0]?.user?.id
						const group = typeof id === 'string' ? findGroups(element)?.[0] : undefined
						// The element can be reused between renders, so don't add the row twice.
						if (group && !group.some(item => item?.label === LABEL)) {
							group.push({
								label: LABEL,
								async action() {
									const overrides = getOverrides()
									// This user goes first in the list, so it is the first thing in settings.
									const current = overrides.find(o => o.id === id) ?? { id, url: '' }
									await storage.set({ overrides: [current, ...overrides.filter(o => o !== current)] }, true)
									// Close the profile sheet first, or settings open underneath it.
									ActionSheetActionCreators.hideActionSheet()
									setTimeout(openSettings, 300)
								},
							})
						}
						return element
					})
				},
			),
		)

	// The profile menu is only loaded the first time a profile opens, so also wait for that.
	patch()
	cancels.push(waitForModuleWithImportedPath(PATH, patch))

	return () => {
		for (const cancel of cancels) cancel()
		unpatch?.()
	}
}
