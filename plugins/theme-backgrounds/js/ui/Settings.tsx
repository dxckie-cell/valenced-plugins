import { Design } from '@valenced/discord/design'
import type { PluginApi } from '@valenced/plugins/types'
import { useState } from 'react'
import { Alert, Image, ScrollView, View } from 'react-native'
import { currentBackgroundPath, writeBackground } from '../lib/native'
import { pickImage } from '../lib/pick'
import { settingsOf, urlOf } from '../lib/shuffle'
import { type Background, DEFAULT_LOOK, newBackground, type Storage } from '../lib/storage'
import Preview from './Preview'
import Slider from './Slider'

const percent = (n: number) => `${Math.round(n * 100)}%`

interface EditorProps {
	saved: Background
	/** Whether this image is the background Discord uses right now. */
	active: boolean
	onSave: (next: Background) => void
	onApply: (next: Background) => void
	onRemove: () => void
	onClear: () => void
}

function Editor({ saved, active, onSave, onApply, onRemove, onClear }: EditorProps) {
	const { Button, TableRowGroup, TextInput, Text } = Design
	const [draft, setDraft] = useState(saved)
	const patch = (p: Partial<Background>) => setDraft(d => ({ ...d, ...p }))
	const changed = JSON.stringify(draft) !== JSON.stringify(saved)
	// Nothing to apply while the image is in use and no edit is waiting.
	const applied = active && !changed
	const inShuffle = draft.inShuffle !== false
	const looksDefault = draft.opacity === DEFAULT_LOOK.opacity && draft.blur === DEFAULT_LOOK.blur && draft.dimming === DEFAULT_LOOK.dimming

	return (
		<>
			<TableRowGroup title="PREVIEW">
				<Preview value={draft} onPan={(x, y) => patch({ x, y })} />
				<View style={{ padding: 16, gap: 8 }}>
					<Button variant="primary" text={applied ? 'In use' : 'Use as my background'} disabled={applied} onPress={() => onApply(draft)} />
					<Button variant="secondary" text="Save without using" disabled={!changed} onPress={() => onSave(draft)} />
					{active && <Button variant="secondary" text="Go back to my theme's background" onPress={onClear} />}
				</View>
			</TableRowGroup>

			<TableRowGroup title="ADJUST">
				<Slider label="Zoom" value={draft.zoom} min={1} max={4} step={0.05} format={v => `${v.toFixed(2)}x`} onChange={zoom => patch({ zoom })} />
				<Slider label="Image opacity" value={draft.opacity} min={0} max={1} step={0.05} format={percent} onChange={opacity => patch({ opacity })} />
				<Slider label="Dimming" value={draft.dimming} min={0} max={1} step={0.05} format={percent} onChange={dimming => patch({ dimming })} />
				<Slider label="Blur" value={draft.blur} min={0} max={20} step={1} format={v => String(v)} onChange={blur => patch({ blur })} />
				<View style={{ padding: 16, gap: 8 }}>
					<Button variant="secondary" text="Reset opacity, dimming and blur" disabled={looksDefault} onPress={() => patch(DEFAULT_LOOK)} />
					<Button variant="secondary" text="Reset position and zoom" onPress={() => patch({ zoom: 1, x: 0.5, y: 0.5 })} />
				</View>
			</TableRowGroup>

			<TableRowGroup title="THIS IMAGE">
				<TextInput label="Name" placeholder="My background" value={draft.name} onChange={(name: string) => patch({ name })} />
				<View style={{ padding: 16, gap: 8 }}>
					<Button
						variant={inShuffle ? 'primary' : 'secondary'}
						text={inShuffle ? 'In shuffle (tap to remove)' : 'Add to shuffle'}
						// Saved at once, the shuffle choice does not wait for the other edits.
						onPress={() => {
							patch({ inShuffle: !inShuffle })
							onSave({ ...saved, inShuffle: !inShuffle })
						}}
					/>
					<Button variant="destructive" text="Delete this image" onPress={onRemove} />
				</View>
				<Text variant="text-xs/medium" color="text-muted" style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
					Your color theme stays as it is. Only its background is replaced. Discord needs a reload to show the change.
				</Text>
			</TableRowGroup>
		</>
	)
}

export default function Settings({ api }: { api: PluginApi<{ jsonStorage: Storage }> }) {
	const { Button, TableRowGroup, TextInput, Text } = Design
	const stored = api.jsonStorage.use()
	const list: Background[] = stored?.backgrounds ?? []
	const shuffle = stored?.shuffle ?? false
	const hideHeader = stored?.hideHeader ?? false
	const [link, setLink] = useState('')
	// Only one image is open at a time, so the screen stays short.
	const [open, setOpen] = useState<string | undefined>()
	// Read again after every change; Discord's own copy only updates on reload, so this is the saved one.
	const [path, setPath] = useState(currentBackgroundPath)

	const save = (next: Background[]) => api.jsonStorage.set({ backgrounds: next, shuffle, hideHeader })
	const fail = (e: unknown) => Alert.alert('Could not change the background', String((e as Error)?.message ?? e))

	async function apply(next: Background) {
		try {
			await writeBackground(settingsOf(next))
			save(list.map(b => (b.id === next.id ? next : b)))
			setPath(currentBackgroundPath())
			api.plugin.requireReload()
		} catch (e) {
			fail(e)
		}
	}

	async function clear() {
		try {
			await writeBackground(null)
			setPath(currentBackgroundPath())
			api.plugin.requireReload()
		} catch (e) {
			fail(e)
		}
	}

	// The size is needed to crop, and it also proves the link is an image.
	const add = (url: string) =>
		Image.getSize(
			url,
			(w, h) => {
				const bg = newBackground(url, w, h)
				save([...list, bg])
				setLink('')
				setOpen(bg.id)
			},
			() => Alert.alert('Not an image', 'Could not load an image from that link.'),
		)

	const shuffled = list.filter(b => b.inShuffle !== false).length

	return (
		<ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
			<TableRowGroup title="ADD AN IMAGE">
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

			{list.length > 1 && (
				<TableRowGroup title="SHUFFLE">
					<View style={{ padding: 16, gap: 8 }}>
						<Button
							variant={shuffle ? 'primary' : 'secondary'}
							text={shuffle ? 'Shuffle on every start: On' : 'Shuffle on every start: Off'}
							onPress={() => api.jsonStorage.set({ backgrounds: list, shuffle: !shuffle, hideHeader })}
						/>
						<Text variant="text-xs/medium" color="text-muted">
							{`Each time Discord starts it picks another image for the next start, from the ${shuffled} marked "In shuffle". Use "Go back to my theme's background" to stop it.`}
						</Text>
					</View>
				</TableRowGroup>
			)}

			<TableRowGroup title="SERVER HEADER">
				<View style={{ padding: 16, gap: 8 }}>
					<Button
						variant={hideHeader ? 'primary' : 'secondary'}
						text={hideHeader ? 'Clear the server header: On' : 'Clear the server header: Off'}
						onPress={() => {
							api.jsonStorage.set({ backgrounds: list, shuffle, hideHeader: !hideHeader })
							api.plugin.requireReload()
						}}
					/>
					<Text variant="text-xs/medium" color="text-muted">
						Removes the image slice behind the server name and Search. If a chat background goes blank, turn it off.
					</Text>
				</View>
			</TableRowGroup>

			<TableRowGroup title={`YOUR IMAGES (${list.length})`}>
				{list.length === 0 && (
					<Text variant="text-sm/medium" color="text-muted" style={{ padding: 16 }}>
						No images yet. Add one above.
					</Text>
				)}
				{list.map(bg => {
					const active = path === urlOf(bg)
					const tags = [active && 'In use', bg.inShuffle !== false && 'Shuffle'].filter(Boolean).join(' · ')
					return (
						<View key={bg.id} style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
							<Button
								variant={open === bg.id ? 'primary' : 'secondary'}
								text={`${bg.name}${tags ? `  (${tags})` : ''}`}
								onPress={() => setOpen(open === bg.id ? undefined : bg.id)}
							/>
						</View>
					)
				})}
			</TableRowGroup>

			{list.map(bg =>
				open === bg.id ? (
					<Editor
						key={bg.id}
						saved={bg}
						active={path === urlOf(bg)}
						onSave={next => save(list.map(b => (b.id === bg.id ? next : b)))}
						onApply={apply}
						onClear={clear}
						onRemove={async () => {
							if (path === urlOf(bg)) await clear()
							setOpen(undefined)
							save(list.filter(b => b.id !== bg.id))
						}}
					/>
				) : null,
			)}
		</ScrollView>
	)
}
