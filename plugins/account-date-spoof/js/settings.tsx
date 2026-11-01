import Page from '@valenced/components/Page'
import { Design } from '@valenced/discord/design'
import { useState } from 'react'
import { ScrollView } from 'react-native'
import { DEFAULT_DATE, DefaultSettings, parseDate } from '.'
import type { PluginSettingsComponent } from '@valenced/plugins/types'
import type { ComponentProps } from 'react'
import type { Settings } from '.'

const { TableRowGroup, TableSwitchRow, TextInput } = Design

type Props = ComponentProps<PluginSettingsComponent<{ jsonStorage: Settings }>>

export default function SettingsComponent({
	api: { jsonStorage: storage },
}: Props) {
	const { enabled, date } = { ...DefaultSettings, ...storage.use() }
	const [error, setError] = useState('')

	return (
		<ScrollView keyboardShouldPersistTaps="handled">
			<Page>
				<TableRowGroup>
					<TableSwitchRow
						label="Enabled"
						subLabel="Only changes what you see on your own profile."
						value={enabled}
						onValueChange={enabled => storage.set({ enabled })}
					/>
				</TableRowGroup>
				<TextInput
					label="Member Since (DD-MM-YYYY)"
					placeholder={DEFAULT_DATE}
					defaultValue={date}
					status={error ? 'error' : 'default'}
					errorMessage={error || undefined}
					onChange={value => {
						if (!parseDate(value)) {
							setError('Enter a valid date as DD-MM-YYYY')
							return
						}

						setError('')
						storage.set({ date: value.trim() })
					}}
				/>
			</Page>
		</ScrollView>
	)
}
