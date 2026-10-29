import * as components from '@valenced/components'
import { AlertActionCreators } from '@valenced/discord/actions'
import { Design } from '@valenced/discord/design'
import * as ReactNative from 'react-native'
import { useLoadedPins } from '../lib/discord'
import { clearPins, usePins } from '../lib/state'
import { openPinActions } from './PinList'

/** Settings page: every local pin across channels, plus data controls. Read `Design` at render only. */
export default function Settings() {
	const { Page } = components
	const { Stack, Text, Card, TableRowGroup, TableRow } = Design
	const pins = usePins()
	const data = useLoadedPins(pins)
	const kb = Math.round((JSON.stringify(pins).length / 1000) * 100) / 100

	const confirmClear = () => {
		const { AlertModal, AlertActionButton } = Design
		const key = 'LocalPinsClear'
		const close = () => AlertActionCreators.dismissAlert(key)
		AlertActionCreators.openAlert(
			key,
			<AlertModal
				title="Clear data"
				content="Are you sure you want to clear all local pin data?"
				actions={
					<>
						<AlertActionButton
							text="Clear"
							variant="destructive"
							onPress={() => {
								close()
								clearPins()
							}}
						/>
						<AlertActionButton text="Cancel" variant="secondary" onPress={close} />
					</>
				}
			/>,
		)
	}

	return (
		<Page>
			<ReactNative.ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
				<Stack spacing={24}>
					<Card variant="secondary" border="none">
						<ReactNative.View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
							<Text color="text-default" variant="text-md/semibold">
								Long-press a message, tap Pin Message Locally
							</Text>
							<Text color="text-muted" variant="text-sm/normal" style={{ marginTop: 8 }}>
								Local pins are only on this device. See a channel's pins in its Pins tab.
							</Text>
						</ReactNative.View>
					</Card>

					<TableRowGroup title={`Local pins (${pins.length})`}>
						{!pins.length && <TableRow label="Nothing pinned yet" />}
						{pins.length > 0 && !data && <TableRow label="Loading…" />}
						{data?.map(entry => (
							<TableRow
								key={entry.pin.id}
								label={
									entry.message
										? `${entry.message.author?.globalName ?? entry.message.author?.username ?? 'unknown'} in #${entry.channel?.name ?? 'unknown'}`
										: 'Message unavailable'
								}
								subLabel={entry.message?.content?.slice(0, 120) || undefined}
								arrow
								onPress={() => openPinActions(entry)}
							/>
						))}
					</TableRowGroup>

					<TableRowGroup title="Data">
						<TableRow label="Data size" subLabel={`${kb} kilobytes`} />
						<TableRow label="Clear data" variant="danger" arrow onPress={confirmClear} />
					</TableRowGroup>
				</Stack>
			</ReactNative.ScrollView>
		</Page>
	)
}
