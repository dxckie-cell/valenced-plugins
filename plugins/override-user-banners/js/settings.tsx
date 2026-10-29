import Page from '@valenced/components/Page'
import { Design } from '@valenced/discord/design'
import { useEffect, useState } from 'react'
import { ScrollView } from 'react-native'
import { schedulePrefetch } from './prefetch'
import { type BannerOverride, getStatusLines } from './state'

import type { PluginSettingsComponent } from '@valenced/plugins/types'
import type { Settings } from './state'

export const SettingsComponent: PluginSettingsComponent<{ jsonStorage: Settings }> = ({
	api,
}) => {
	const storage = api.jsonStorage

	const [rows, setRows] = useState<BannerOverride[]>(
		() => (storage.cache as Partial<Settings> | undefined)?.overrides ?? [],
	)

	// If the storage had not finished loading when this page opened.
	useEffect(() => {
		storage.get().then(value => setRows(value.overrides ?? []))
	}, [storage])

	const update = (next: BannerOverride[]) => {
		setRows(next)
		storage.set({ overrides: next }, true)
		schedulePrefetch()
	}

	const edit = (index: number, changes: Partial<BannerOverride>) =>
		update(rows.map((row, i) => (i === index ? { ...row, ...changes } : row)))

	return (
		<ScrollView keyboardShouldPersistTaps="handled">
			<Page>
				{rows.map((row, index) => (
					<Design.TableRowGroup key={index} title={`User ${index + 1}`}>
						<Design.TextInput
							label="User ID"
							placeholder="Enter target user ID"
							value={row.id}
							onChange={id => edit(index, { id })}
						/>
						<Design.TextInput
							label="Banner image URL"
							placeholder="Enter banner image URL"
							value={row.url}
							onChange={url => edit(index, { url })}
						/>
						<Design.TableRow
							label="Remove this user"
							variant="danger"
							onPress={() => update(rows.filter((_, i) => i !== index))}
						/>
					</Design.TableRowGroup>
				))}

				<Design.TableRowGroup>
					<Design.TableRow
						label="+ Add user"
						onPress={() => update([...rows, { id: '', url: '' }])}
					/>
				</Design.TableRowGroup>

				<Design.TableRowGroup title="Status">
					{getStatusLines().map((line, index) => (
						<Design.TableRow key={index} label={line} />
					))}
				</Design.TableRowGroup>
			</Page>
		</ScrollView>
	)
}
