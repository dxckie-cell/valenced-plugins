import { Design } from '@valenced/discord/design'
import type { PluginApi } from '@valenced/plugins/types'
import { useState } from 'react'
import { Alert, Image, ScrollView, View } from 'react-native'
import { pickImage } from '../lib/pick'
import { type Background, newBackground, type Storage } from '../lib/storage'
import Preview from './Preview'
import Slider from './Slider'

const percent = (n: number) => `${Math.round(n * 100)}%`

function Editor({ saved, onApply, onRemove }: { saved: Background; onApply: (next: Background) => void; onRemove: () => void }) {
	const { Button, TableRowGroup, TextInput, Text } = Design
	const [draft, setDraft] = useState(saved)
	const patch = (p: Partial<Background>) => setDraft(d => ({ ...d, ...p }))
	const changed = JSON.stringify(draft) !== JSON.stringify(saved)

	return (
		<TableRowGroup title={saved.name.toUpperCase()}>
			<Preview value={draft} onPan={(x, y) => patch({ x, y })} />
			<Slider label="Zoom" value={draft.zoom} min={1} max={4} step={0.05} format={v => `${v.toFixed(2)}x`} onChange={zoom => patch({ zoom })} />
			<Slider label="Image opacity" value={draft.opacity} min={0} max={1} step={0.05} format={percent} onChange={opacity => patch({ opacity })} />
			<Slider label="Dimming" value={draft.dimming} min={0} max={1} step={0.05} format={percent} onChange={dimming => patch({ dimming })} />
			<Slider label="Blur" value={draft.blur} min={0} max={20} step={1} format={v => String(v)} onChange={blur => patch({ blur })} />
			<TextInput label="Name" placeholder="My background" value={draft.name} onChange={(name: string) => patch({ name })} />
			<View style={{ padding: 16, gap: 8 }}>
				<Button variant="primary" text={changed ? 'Apply changes' : 'Applied'} disabled={!changed} onPress={() => onApply(draft)} />
				<Button variant="secondary" text="Reset position and zoom" onPress={() => patch({ zoom: 1, x: 0.5, y: 0.5 })} />
				<Button variant="destructive" text="Remove this background" onPress={onRemove} />
			</View>
			<Text variant="text-xs/medium" color="text-muted" style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
				Pick it in Settings, Themes, Colors, under Backgrounds. It replaces your current color theme.
			</Text>
		</TableRowGroup>
	)
}

export default function Settings({ api }: { api: PluginApi<{ jsonStorage: Storage }> }) {
	const { Button, TableRowGroup, TextInput } = Design
	const list: Background[] = api.jsonStorage.use()?.backgrounds ?? []
	const [link, setLink] = useState('')

	const save = (next: Background[]) => api.jsonStorage.set({ backgrounds: next }, true)

	// The size is needed to crop, and it also proves the link is an image.
	const add = (url: string) =>
		Image.getSize(
			url,
			(w, h) => {
				save([...list, newBackground(url, w, h)])
				setLink('')
			},
			() => Alert.alert('Not an image', 'Could not load an image from that link.'),
		)

	return (
		<ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
			{list.map(bg => (
				<Editor
					key={bg.id}
					saved={bg}
					onApply={next => save(list.map(b => (b.id === bg.id ? next : b)))}
					onRemove={() => save(list.filter(b => b.id !== bg.id))}
				/>
			))}
			<TableRowGroup title="ADD A BACKGROUND">
				<TextInput label="Image link" placeholder="https://..." value={link} onChange={setLink} />
				<View style={{ padding: 16, gap: 8 }}>
					<Button variant="primary" text="Add from link" disabled={!/^https?:\/\//.test(link.trim())} onPress={() => add(link.trim())} />
					<Button
						variant="secondary"
						text="Upload from my device"
						onPress={async () => {
							const url = await pickImage()
							if (url) add(url)
						}}
					/>
				</View>
			</TableRowGroup>
		</ScrollView>
	)
}
