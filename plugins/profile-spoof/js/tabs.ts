export type TabKey = 'badges' | 'account'

// The tab the settings screen opens on, set by the rows in Valenced's settings before it opens.
let requested: TabKey = 'badges'

export const requestTab = (tab: TabKey) => {
	requested = tab
}

export const takeRequestedTab = (): TabKey => {
	const tab = requested
	requested = 'badges'
	return tab
}
