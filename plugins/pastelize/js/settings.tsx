import Page from '@valenced/components/Page'
import { Design } from '@valenced/discord/design'
import { useEffect, useState } from 'react'
import { ScrollView } from 'react-native'

import type { PluginSettingsComponent } from '@valenced/plugins/types'
import { DEFAULT_SETTINGS, type Settings } from './state'

export const SettingsComponent: PluginSettingsComponent<{ jsonStorage: Settings }> = ({ api }) => {
	const storage = api.jsonStorage
	const [settings, setSettings] = useState<Settings>({
		...DEFAULT_SETTINGS,
		...((storage.cache as Partial<Settings> | undefined) ?? {}),
	})

	// If the storage had not finished loading when this page opened.
	useEffect(() => {
		storage.get().then(value => setSettings({ ...DEFAULT_SETTINGS, ...value }))
	}, [storage])

	const change = (field: keyof Settings) => (value: boolean) => {
		const merged = { ...settings, [field]: value }
		setSettings(merged)
		storage.set(merged, true)
	}

	return (
		<ScrollView>
			<Page>
				<Design.TableRowGroup>
					<Design.TableSwitchRow
						label="Pastelize all"
						subLabel="Ignores checking for no role"
						value={settings.pastelizeAll}
						onValueChange={change('pastelizeAll')}
					/>
					<Design.TableSwitchRow
						label="Pastelize webhooks by display name"
						subLabel="Otherwise uses the webhook ID"
						value={settings.webhookName}
						onValueChange={change('webhookName')}
					/>
				</Design.TableRowGroup>
			</Page>
		</ScrollView>
	)
}
