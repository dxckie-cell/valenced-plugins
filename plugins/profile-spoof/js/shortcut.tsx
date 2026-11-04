import TableRowAssetIcon from '@valenced/components/TableRowAssetIcon'
import {
	addSettingsItemToSection,
	onSettingsModulesLoaded,
	refreshSettings,
	registerSettingsItem,
} from '@valenced/discord/modules/settings'
import { requestTab, type TabKey } from './tabs'

// Rows at the bottom of the Valenced section of Discord's settings. Badges and Account open this
// plugin's settings on that tab; Profile opens them as they were left.
const ROWS = [
	{ key: 'ProfileSpoofBadges', title: 'Badges', icon: 'StarIcon', tab: 'badges' as TabKey },
	{ key: 'ProfileSpoofAccount', title: 'Account', icon: 'UserIcon', tab: 'account' as TabKey },
	{ key: 'ProfileSpoof', title: 'Profile', icon: 'UserIcon', tab: undefined },
]

export function addProfileRows(open: () => void): () => void {
	const undo: (() => void)[] = []

	// The Valenced section only exists once Discord's settings modules have loaded.
	const unsubscribe = onSettingsModulesLoaded(() => {
		for (const row of ROWS) {
			const unregister = registerSettingsItem(row.key, {
				parent: null,
				type: 'pressable',
				withArrow: true,
				IconComponent: () => <TableRowAssetIcon name={row.icon} />,
				useTitle: () => row.title,
				onPress: () => {
					if (row.tab) requestTab(row.tab)
					open()
				},
			})
			const remove = addSettingsItemToSection('VALENCED', row.key)
			undo.push(remove, unregister)
		}
		refreshSettings()
	})

	return () => {
		unsubscribe()
		for (const fn of undo.splice(0)) fn()
		refreshSettings()
	}
}
