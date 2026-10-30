import Page from '@valenced/components/Page'
import { Design } from '@valenced/discord/design'
import { useEffect, useState } from 'react'
import { ScrollView } from 'react-native'

import type { PluginSettingsComponent } from '@valenced/plugins/types'
import { DEFAULT_SETTINGS, type Settings } from './state'

type Field = 'excludedServers' | 'excludedDMs'
type ColorField = 'tileColor' | 'circleColor'

function ExcludeSection({
	title,
	placeholder,
	list,
	onChange,
}: {
	title: string
	placeholder: string
	list: string[]
	onChange: (next: string[]) => void
}) {
	const [value, setValue] = useState('')

	const add = () => {
		const id = value.trim()
		if (!id || list.includes(id)) return
		onChange([...list, id])
		setValue('')
	}

	return (
		<>
			<Design.TableRowGroup title={title}>
				<Design.TextInput
					placeholder={placeholder}
					value={value}
					onChange={setValue}
					isClearable
					onSubmitEditing={add}
					returnKeyType="done"
				/>
			</Design.TableRowGroup>

			<Design.TableRowGroup>
				<Design.TableRow label="Add exception" onPress={add} />
			</Design.TableRowGroup>

			{list.length > 0 && (
				<Design.TableRowGroup title="Excluded">
					{list.map(id => (
						<Design.TableRow
							key={id}
							label={id}
							variant="danger"
							subLabel="Tap to remove"
							onPress={() => onChange(list.filter(x => x !== id))}
						/>
					))}
				</Design.TableRowGroup>
			)}
		</>
	)
}

export const SettingsComponent: PluginSettingsComponent<{ jsonStorage: Settings }> = ({
	api,
}) => {
	const storage = api.jsonStorage

	const read = (): Settings => ({
		...DEFAULT_SETTINGS,
		...((storage.cache as Partial<Settings> | undefined) ?? {}),
	})

	const [settings, setSettings] = useState<Settings>(read)

	// If the storage had not finished loading when this page opened.
	useEffect(() => {
		storage.get().then(value => setSettings({ ...DEFAULT_SETTINGS, ...value }))
	}, [storage])

	const update = (field: Field, next: string[]) => {
		const merged = { ...settings, [field]: next }
		setSettings(merged)
		storage.set(merged, true)
	}

	const updateColor = (field: ColorField, value: string) => {
		const merged = { ...settings, [field]: value }
		setSettings(merged)
		storage.set(merged, true)
	}

	return (
		<ScrollView keyboardShouldPersistTaps="handled">
			<Page>
				<Design.TableRowGroup title="Button colors (leave empty to match the theme)">
					<Design.TextInput
						label="Tile color"
						placeholder="#2b2d31"
						value={settings.tileColor}
						onChange={(v: string) => updateColor('tileColor', v)}
					/>
					<Design.TextInput
						label="Circle color"
						placeholder="#dbdee1"
						value={settings.circleColor}
						onChange={(v: string) => updateColor('circleColor', v)}
					/>
				</Design.TableRowGroup>
				<ExcludeSection
					title="Exclude Server"
					placeholder="Enter Server ID"
					list={settings.excludedServers}
					onChange={next => update('excludedServers', next)}
				/>
				<ExcludeSection
					title="Exclude DM / Group"
					placeholder="Enter Channel ID"
					list={settings.excludedDMs}
					onChange={next => update('excludedDMs', next)}
				/>
			</Page>
		</ScrollView>
	)
}
