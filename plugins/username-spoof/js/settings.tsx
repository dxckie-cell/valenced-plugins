import Page from '@valenced/components/Page'
import { Design } from '@valenced/discord/design'
import { useEffect, useState } from 'react'
import { DefaultSettings, refreshUsers } from './shared'
import type { PluginSettingsComponent } from '@valenced/plugins/types'
import type { ComponentProps } from 'react'
import type { Settings } from './shared'

const { Stack, TextInput } = Design

type Props = ComponentProps<PluginSettingsComponent<{ jsonStorage: Settings }>>

export default function SettingsComponent({
	api: { jsonStorage: storage },
}: Props) {
	const settings = { ...DefaultSettings, ...storage.use() }
	const [username, setUsername] = useState(settings.username)
	const [displayName, setDisplayName] = useState(settings.displayName)

	useEffect(() => {
		refreshUsers()
	}, [settings.username, settings.displayName])

	return (
		<Page>
			<Stack spacing={16}>
				<TextInput
					label="Username"
					placeholder="Leave empty to keep your real username"
					size="md"
					value={username}
					onChange={(value: string) => {
						setUsername(value)
						storage.set({ username: value })
					}}
				/>
				<TextInput
					label="Display name"
					placeholder="Leave empty to keep your real display name"
					size="md"
					value={displayName}
					onChange={(value: string) => {
						setDisplayName(value)
						storage.set({ displayName: value })
					}}
				/>
			</Stack>
		</Page>
	)
}
