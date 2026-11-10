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
				<Design.TableRowGroup title="Klipy API key">
					<Design.TextInput
						label="API key"
						placeholder="paste your key here"
						value={apiKey}
						onChange={change}
					/>
				</Design.TableRowGroup>

				<Design.TableRowGroup title="Notes">
					<Design.TableRow label="Get a free key at klipy.com/developers. It is stored only on this device and sent only to api.klipy.com." />
					<Design.TableRow label="Without a key, or if Klipy has no GIF for an item, the .mp4 is saved as usual." />
				</Design.TableRowGroup>
			</Page>
		</ScrollView>
	)
}
