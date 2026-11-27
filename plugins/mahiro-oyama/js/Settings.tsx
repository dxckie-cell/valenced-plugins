import * as components from '@valenced/components'
import { Design } from '@valenced/discord/design'
import * as React from 'react'
import * as ReactNative from 'react-native'
import { reportError } from '../../../shared/report'
import { FieldGroup } from '../../../shared/ui/fieldGroup'
import { rowIcon } from '../../../shared/ui/icon'
import { useBottomPadding } from '../../../shared/ui/safeArea'
import { callNative, DEFAULTS, type MahiroSettings } from './native'

/** A slider that sends the value once the thumb rests, so the pet doesn't resize on every pixel of a drag. */
function DelayedSlider({ value, min, max, onDone }: { value: number; min: number; max: number; onDone: (v: number) => void }) {
	const { Slider } = Design as any
	const [shown, setShown] = React.useState(value)
	const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
	React.useEffect(() => setShown(value), [value])
	return (
		<Slider
			step={1}
			value={shown}
			minimumValue={min}
			maximumValue={max}
			onValueChange={(raw: number) => {
				const v = Math.round(raw)
				setShown(v)
				if (timer.current) clearTimeout(timer.current)
				timer.current = setTimeout(() => onDone(v), 250)
			}}
		/>
	)
}

export default function Settings() {
	// Read per render, never at module scope: the design components may not be loaded yet.
	const { Page } = components
	const { ScrollView } = ReactNative
	const { Stack, Text, Card, TableRowGroup, TableRow, TableSwitchRow } = Design as any
	const bottom = useBottomPadding()
	const [s, setS] = React.useState<MahiroSettings>(DEFAULTS)

	React.useEffect(() => {
		callNative('getSettings')
			.then((state: MahiroSettings) => state && setS({ ...DEFAULTS, ...state }))
			.catch(error => reportError('[Mahiro] getSettings failed:', error))
	}, [])

	const update = (patch: Partial<MahiroSettings>) => {
		setS(prev => ({ ...prev, ...patch }))
		callNative('setSettings', [patch]).catch(error => reportError('[Mahiro] setSettings failed:', error))
	}

	return (
		<Page>
			<ScrollView contentContainerStyle={{ paddingBottom: bottom }}>
				<Stack spacing={24}>
					<Card variant="secondary" border="none">
						<Text color="text-muted" variant="text-sm/normal" style={{ padding: 16 }}>
							Mahiro walks, dashes, sits and climbs the screen edges and ceiling on top of Discord. Tap her to make her
							jump, drag to carry her, flick to throw her. She only lives on this phone.
						</Text>
					</Card>

					<TableRowGroup hasIcons>
						<TableSwitchRow
							label="Show Mahiro"
							icon={rowIcon('ReactionIcon', 'StarIcon')}
							value={s.show}
							onValueChange={(show: boolean) => update({ show })}
						/>
						<TableRow
							label="Call Mahiro over"
							subLabel={s.show ? 'Drops her in from the middle of the screen.' : 'Turn on Show Mahiro first.'}
							icon={rowIcon('RefreshIcon', 'ic_refresh')}
							disabled={!s.show}
							onPress={() => callNative('recenter').catch(error => reportError('[Mahiro] recenter failed:', error))}
						/>
						<TableSwitchRow
							label="Haptics"
							subLabel="A small tap when you touch her."
							value={s.haptics}
							onValueChange={(haptics: boolean) => update({ haptics })}
						/>
					</TableRowGroup>

					<FieldGroup title="Size" label={`${s.sizeDp} dp`}>
						<DelayedSlider value={s.sizeDp} min={40} max={200} onDone={sizeDp => update({ sizeDp })} />
					</FieldGroup>

					<FieldGroup title="Speed" label={`${s.speed}%`}>
						<DelayedSlider value={s.speed} min={25} max={300} onDone={speed => update({ speed })} />
					</FieldGroup>
				</Stack>
			</ScrollView>
		</Page>
	)
}
