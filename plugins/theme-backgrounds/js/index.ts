/// <reference types="@valenced/themes-api" />

import { Dimensions } from 'react-native'
import { croppedUrl } from './lib/crop'
import { DEFAULTS, type Storage } from './lib/storage'
import Settings from './ui/Settings'

const GROUP = 'theme-backgrounds'

export default plugin<{ jsonStorage: Storage }>({
	jsonStorage: {
		load: true,
		default: DEFAULTS,
	},

	async start(api) {
		// The Themes API has no way to unregister a theme, so a removed background needs a reload to disappear.
		const themes = (api as any).themes
		await api.jsonStorage.get().catch(() => {})

		themes.registerGroup(GROUP, {
			name: 'Backgrounds',
			description: 'Your own images, cropped to fit the screen.',
		})

		let known = new Set<string>()
		const sync = () => {
			const { width, height } = Dimensions.get('window')
			const list = (api.jsonStorage.cache?.backgrounds ?? []).filter(bg => bg.url)
			for (const bg of list) {
				// Registering the same ID again updates the theme, and re-applies it if it is the picked one.
				themes.registerTheme(GROUP, bg.id, {
					name: bg.name || 'Background',
					getColors: () => ({}),
					background: {
						path: croppedUrl(bg, width / height),
						opacity: bg.opacity,
						blur: bg.blur,
						dimming: bg.dimming,
					},
				})
			}
			const now = new Set(list.map(bg => bg.id))
			if ([...known].some(id => !now.has(id))) api.plugin.requireReload()
			known = now
		}

		sync()
		api.cleanup(api.jsonStorage.subscribe(sync))
	},

	SettingsComponent: Settings,
})
