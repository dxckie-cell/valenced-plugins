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

	const save = (merged: Settings) => {
		setSettings(merged)
		storage.set(merged, true)
	}
	const change = (field: 'pastelizeAll' | 'webhookName') => (value: boolean) =>
		save({ ...settings, [field]: value })

	// Typed text stays as typed. Only a number from 0 to 100 is saved.
	const [typed, setTyped] = useState<Record<'saturation' | 'lightness', string | undefined>>({
		saturation: undefined,
		lightness: undefined,
	})
	const percent = (field: 'saturation' | 'lightness') => (text: string) => {
		setTyped(t => ({ ...t, [field]: text }))
		const n = Number(text)
		if (text.trim() !== '' && Number.isFinite(n) && n >= 0 && n <= 100) save({ ...settings, [field]: n })
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
				<Design.TableRowGroup title="Color">
					<Design.TextInput
						label="Lightness"
						placeholder="60"
						value={typed.lightness ?? String(settings.lightness)}
						onChange={percent('lightness')}
					/>
					<Design.TextInput
						label="Saturation"
						placeholder="75"
						value={typed.saturation ?? String(settings.saturation)}
						onChange={percent('saturation')}
					/>
				</Design.TableRowGroup>
			</Page>
		</ScrollView>
	)
}
