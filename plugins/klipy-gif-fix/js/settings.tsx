import Page from '@valenced/components/Page'
import { Design } from '@valenced/discord/design'
import { useEffect, useState } from 'react'
import { ScrollView } from 'react-native'
import { DEFAULT_SETTINGS, type Settings } from './state'

import type { PluginSettingsComponent } from '@valenced/plugins/types'

export const SettingsComponent: PluginSettingsComponent<{
	jsonStorage: Settings
}> = ({ api }) => {
	const storage = api.jsonStorage

	const [apiKey, setApiKey] = useState(
		() => (storage.cache as Partial<Settings> | undefined)?.apiKey ?? '',
	)

	// If the storage had not finished loading when this page opened.
	useEffect(() => {
		storage.get().then(value => setApiKey(value?.apiKey ?? ''))
	}, [storage])

	const change = (value: string) => {
		setApiKey(value)
		storage.set({ ...DEFAULT_SETTINGS, apiKey: value.trim() }, true)
	}

	return (
		<ScrollView keyboardShouldPersistTaps="handled">
			<Page>
				<Design.TableRowGroup title="Klipy API key (optional)">
					<Design.TextInput
						label="API key"
						placeholder="leave empty to use the built-in key"
						value={apiKey}
						onChange={change}
					/>
				</Design.TableRowGroup>

				<Design.TableRowGroup title="Notes">
					<Design.TableRow label="The plugin works out of the box with a shared key. To use your own, get a free one at klipy.com/developers. It is stored only on this device and sent only to api.klipy.com." />
					<Design.TableRow label="If Klipy has no GIF for an item, or the key stops working, the .mp4 is saved as usual." />
				</Design.TableRowGroup>
			</Page>
		</ScrollView>
	)
}
