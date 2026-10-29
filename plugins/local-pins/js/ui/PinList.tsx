import { AlertActionCreators } from '@valenced/discord/actions'
import { Design } from '@valenced/discord/design'
import { Stores } from '@valenced/discord/flux'
import { lookupModule } from '@valenced/modules/finders'
import { withName, withProps } from '@valenced/modules/finders/filters'
import * as React from 'react'
import * as ReactNative from 'react-native'
import { jumpToMessage, useLoadedPins } from '../lib/discord'
import type { LoadedPin } from '../lib/discord'
import { removePin, usePins } from '../lib/state'

/** Unpin / jump sheet for one pin, shown as an alert. */
export function openPinActions(entry: LoadedPin, afterJump?: () => void) {
	const { AlertModal, AlertActionButton } = Design
	const key = 'LocalPinActions'
	const close = () => AlertActionCreators.dismissAlert(key)
	AlertActionCreators.openAlert(
		key,
		<AlertModal
			title="Local pin"
			content={entry.message?.content || 'Choose what to do with this pin.'}
			actions={
				<>
					<AlertActionButton
						text="Jump to message"
						onPress={() => {
							close()
							afterJump?.()
							setTimeout(() => jumpToMessage(entry.pin.channelId, entry.pin.id), 150)
						}}
					/>
					<AlertActionButton
						text="Unpin"
						variant="destructive"
						onPress={() => {
							close()
							removePin(entry.pin.channelId, entry.pin.id)
						}}
					/>
					<AlertActionButton text="Cancel" variant="secondary" onPress={close} />
				</>
			}
		/>,
	)
}

function authorOf(message: any) {
	return message?.author?.globalName ?? message?.author?.username ?? 'unknown'
}

function PlainMessage({ message }: { message: any }) {
	const { Text } = Design
	const attachments = message.attachments?.length ?? 0
	return (
		<ReactNative.View style={{ gap: 2 }}>
			<Text variant="text-sm/semibold" color="text-default">
				{authorOf(message)}
			</Text>
			<Text variant="text-md/medium" color="text-default">
				{message.content || (attachments ? `[${attachments} attachment(s)]` : '[no text]')}
			</Text>
		</ReactNative.View>
	)
}

let boundary: any
/** Built on first render: `React` isn't available yet when the plugin bundle is evaluated. */
function getBoundary() {
	return (boundary ??= class extends React.Component<{ fallback: any; children: any }, { failed: boolean }> {
		state = { failed: false }
		static getDerivedStateFromError() {
			return { failed: true }
		}
		render() {
			return this.state.failed ? this.props.fallback : this.props.children
		}
	})
}

function NativeMessage({ message }: { message: any }) {
	const pick = (r: any) => (typeof r === 'function' ? r : r?.default)
	const Chat = (lookupModule(withProps('DCDAutoModerationSystemMessageView', 'default'))?.[0] as any)?.default
	const Record = pick(lookupModule(withName('MessageRecord'))?.[0])
	const Rows = pick(lookupModule(withName('RowManager'))?.[0])
	if (!Chat || !Record || !Rows) throw new Error('renderer not found')
	return <Chat rowGenerator={new Rows()} message={new Record(message)} />
}

/** Discord's own message renderer when it can be found; the plain version otherwise. */
function SafeMessage({ message }: { message: any }) {
	const Boundary = getBoundary()
	return (
		<Boundary fallback={<PlainMessage message={message} />}>
			<NativeMessage message={message} />
		</Boundary>
	)
}

function guildName(channel: any) {
	const guild = channel?.guild_id ? (Stores as any).GuildStore?.getGuild?.(channel.guild_id) : undefined
	return guild?.name ? `${guild.name} · ` : ''
}

function Entry({ entry }: { entry: LoadedPin }) {
	const { Text } = Design
	if (!entry.message) {
		return (
			<ReactNative.Pressable
				onPress={() => openPinActions(entry)}
				style={{ padding: 12, borderRadius: 8 }}
			>
				<Text variant="text-md/medium" color="text-muted">
					Message unavailable (deleted or no access). Tap to unpin.
				</Text>
			</ReactNative.Pressable>
		)
	}
	return (
		<ReactNative.Pressable
			onPress={() => jumpToMessage(entry.pin.channelId, entry.pin.id)}
			onLongPress={() => openPinActions(entry)}
			style={{ paddingHorizontal: 8, paddingVertical: 4, gap: 4 }}
		>
			<Text variant="text-md/medium" color="text-muted">
				{guildName(entry.channel)}# {entry.channel?.name ?? 'unknown'}
			</Text>
			{/* the rendered message swallows touches; let the whole card be the tap target */}
			<ReactNative.View pointerEvents="none">
				<SafeMessage message={entry.message} />
			</ReactNative.View>
		</ReactNative.Pressable>
	)
}

/** Every local pin, across all channels and servers (the Pins tab's Local pins view). */
export default function PinList() {
	const { Text } = Design
	const pins = usePins()
	const data = useLoadedPins(pins)

	if (!pins.length) {
		return (
			<ReactNative.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
				<Text variant="text-md/medium" color="text-muted" style={{ textAlign: 'center' }}>
					No local pins yet. Long-press a message and tap Pin Message Locally.
				</Text>
			</ReactNative.View>
		)
	}
	if (!data) {
		return (
			<ReactNative.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
				<ReactNative.ActivityIndicator size="large" />
			</ReactNative.View>
		)
	}
	return (
		<ReactNative.ScrollView style={{ flex: 1 }}>
			<ReactNative.View style={{ gap: 16, paddingHorizontal: 8, paddingTop: 8, paddingBottom: 36 }}>
				{data.map(entry => (
					<Entry key={entry.pin.id} entry={entry} />
				))}
			</ReactNative.View>
		</ReactNative.ScrollView>
	)
}
