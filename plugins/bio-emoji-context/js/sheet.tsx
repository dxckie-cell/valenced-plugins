import { ActionSheetActionCreators } from '@valenced/discord/actions'
import { Design } from '@valenced/discord/design'
import { Image, View } from 'react-native'
import { useEffect, useState } from 'react'
import { getEmojiInfo } from './emoji'
import { lookupEmojiSource } from './source'
import type { EmojiRef } from './emoji'
import type { EmojiSource } from './source'

const { ActionSheet, Stack, Text } = Design

const SheetKey = 'dxckie.bio-emoji-context'

export function openEmojiSheet(emoji: EmojiRef) {
	ActionSheetActionCreators.openLazy(
		Promise.resolve({ default: EmojiContextSheet }),
		SheetKey,
		{ emoji },
		// Keeps the profile open underneath instead of replacing it
		'stack',
	)
}

function EmojiContextSheet({ emoji }: { emoji: EmojiRef }) {
	const info = getEmojiInfo(emoji)

	// Servers you're not in: Discord may still say where the emoji is from
	const [source, setSource] = useState<EmojiSource | undefined>()
	useEffect(() => {
		if (info.guild) return
		let cancelled = false
		lookupEmojiSource(emoji.id).then(result => {
			if (!cancelled) setSource(result)
		})
		return () => {
			cancelled = true
		}
	}, [emoji.id, info.guild])

	const guild = info.guild ?? source

	return (
		<ActionSheet>
			<Stack spacing={16} style={{ paddingVertical: 8 }}>
				<Stack direction="horizontal" spacing={16} align="center">
					<Image
						source={{ uri: info.imageUrl }}
						style={{ width: 48, height: 48 }}
						resizeMode="contain"
					/>
					<Stack spacing={4} style={{ flexShrink: 1 }}>
						<Text variant="text-lg/semibold" color="text-strong">
							:{info.name}:
						</Text>
						<Text variant="text-md/medium" color="text-default">
							{info.guild
								? 'This emoji is from one of your servers. Type its name in the chat bar to use it.'
								: 'This emoji is from a server you are not in.'}
						</Text>
					</Stack>
				</Stack>

				{guild && (
					<Stack spacing={8}>
						<Text variant="text-sm/medium" color="text-muted">
							This emoji is from
						</Text>
						<Stack direction="horizontal" spacing={12} align="center">
							{guild.iconUrl ? (
								<Image
									source={{ uri: guild.iconUrl }}
									style={{ width: 40, height: 40, borderRadius: 12 }}
								/>
							) : (
								<View
									style={{
										width: 40,
										height: 40,
										borderRadius: 12,
										alignItems: 'center',
										justifyContent: 'center',
									}}
								>
									<Text variant="text-md/semibold" color="text-strong">
										{guild.name.charAt(0)}
									</Text>
								</View>
							)}
							<Stack spacing={2} style={{ flexShrink: 1 }}>
								<Text variant="text-md/semibold" color="text-strong">
									{guild.name}
								</Text>
								<Text variant="text-sm/medium" color="text-muted">
									{guild.discoverable ? 'Public server' : 'Invite-only server'}
								</Text>
							</Stack>
						</Stack>
					</Stack>
				)}
			</Stack>
		</ActionSheet>
	)
}
