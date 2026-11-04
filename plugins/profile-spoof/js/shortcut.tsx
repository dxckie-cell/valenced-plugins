import TableRowAssetIcon from '@valenced/components/TableRowAssetIcon'
import {
	addSettingsItemToSection,
	onSettingsModulesLoaded,
	refreshSettings,
	registerSettingsItem,
} from '@valenced/discord/modules/settings'

const KEY = 'ProfileSpoof'

// A "Profile" row at the bottom of the Valenced section of Discord's settings, opening this plugin's settings.
export function addProfileRow(open: () => void): () => void {
	let undo: (() => void) | undefined

	// The Valenced section only exists once Discord's settings modules have loaded.
	const unsubscribe = onSettingsModulesLoaded(() => {
		const unregister = registerSettingsItem(KEY, {
			parent: null,
			type: 'pressable',
			withArrow: true,
			IconComponent: () => <TableRowAssetIcon name="UserIcon" />,
			useTitle: () => 'Profile',
			onPress: open,
		})
		const remove = addSettingsItemToSection('VALENCED', KEY)
		refreshSettings()
		undo = () => {
			remove()
			unregister()
			refreshSettings()
		}
	})

	return () => {
		unsubscribe()
		undo?.()
	}
}
