import { Design } from '@valenced/discord/design'
import type { PluginApi } from '@valenced/plugins/types'
import { ScrollView, View } from 'react-native'
import type { ServerOverride, Storage } from '../lib/storage'
import { refresh } from '../patches/appearance'

export default function Settings({ api }: { api: PluginApi<{ jsonStorage: Storage }> }) {
	const { Button, TableRowGroup, TextInput } = Design
	const overrides: ServerOverride[] = api.jsonStorage.use()?.overrides ?? []

	const save = (next: ServerOverride[]) => {
		api.jsonStorage.set({ overrides: next })
		refresh()
	}

	const edit = (index: number, patch: Partial<ServerOverride>) =>
		save(overrides.map((o, i) => (i === index ? { ...o, ...patch } : o)))

	return (
		<ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
			{overrides.map((entry, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: entries have no other identity
				<TableRowGroup key={index} title={`SERVER ${index + 1}`}>
					<TextInput
						label="Server ID"
						placeholder="Server ID"
						value={entry.id}
						onChange={(v: string) => edit(index, { id: v })}
					/>
					<TextInput
						label="Icon URL"
						placeholder="https://... (optional)"
						value={entry.icon}
						onChange={(v: string) => edit(index, { icon: v })}
					/>
					<TextInput
						label="Banner URL"
						placeholder="https://... (optional)"
						value={entry.banner}
						onChange={(v: string) => edit(index, { banner: v })}
					/>
					<View style={{ padding: 16 }}>
						<Button
							variant="destructive"
							text="Remove this server"
							onPress={() => save(overrides.filter((_, i) => i !== index))}
						/>
					</View>
				</TableRowGroup>
			))}
			<View style={{ padding: 16 }}>
				<Button
					variant="primary"
					text="+ Add server"
					onPress={() => save([...overrides, { id: '', icon: '', banner: '' }])}
				/>
			</View>
		</ScrollView>
	)
}
