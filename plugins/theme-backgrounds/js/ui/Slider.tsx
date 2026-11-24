import { Design } from '@valenced/discord/design'
import { useRef, useState } from 'react'
import { PanResponder, View } from 'react-native'

interface Props {
	label: string
	value: number
	min: number
	max: number
	step: number
	format?: (value: number) => string
	onChange: (value: number) => void
}

/** A small drag slider. Discord's own Slider props are not documented, so this one uses only React Native. */
export default function Slider({ label, value, min, max, step, format, onChange }: Props) {
	const { Text } = Design
	const [width, setWidth] = useState(1)
	const live = useRef({ width, value, min, max, step, onChange })
	live.current = { width, value, min, max, step, onChange }
	const start = useRef(0)

	const pan = useRef(
		PanResponder.create({
			onStartShouldSetPanResponder: () => true,
			onMoveShouldSetPanResponder: () => true,
			// The page scrolls vertically, so a drag that began on the slider must stay with it.
			onPanResponderTerminationRequest: () => false,
			onPanResponderGrant: e => {
				const p = live.current
				start.current = Math.min(Math.max(e.nativeEvent.locationX / p.width, 0), 1)
				set(start.current)
			},
			onPanResponderMove: (_, g) => set(start.current + g.dx / live.current.width),
		}),
	).current

	function set(ratio: number) {
		const p = live.current
		const raw = p.min + Math.min(Math.max(ratio, 0), 1) * (p.max - p.min)
		const snapped = Math.round(raw / p.step) * p.step
		p.onChange(Math.min(Math.max(Number(snapped.toFixed(4)), p.min), p.max))
	}

	const ratio = (value - min) / (max - min)
	return (
		<View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
			<View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
				<Text variant="text-md/medium" color="text-default">{label}</Text>
				<Text variant="text-md/medium" color="text-muted">{format ? format(value) : String(value)}</Text>
			</View>
			<View
				onLayout={e => setWidth(e.nativeEvent.layout.width || 1)}
				style={{ height: 32, justifyContent: 'center' }}
				{...pan.panHandlers}
			>
				<View pointerEvents="none" style={{ height: 4, borderRadius: 2, backgroundColor: '#808080', opacity: 0.4 }} />
				<View pointerEvents="none" style={{ position: 'absolute', height: 4, borderRadius: 2, width: `${ratio * 100}%`, backgroundColor: '#b388e6' }} />
				<View
					pointerEvents="none"
					style={{ position: 'absolute', left: `${ratio * 100}%`, marginLeft: -10, width: 20, height: 20, borderRadius: 10, backgroundColor: '#ffffff' }}
				/>
			</View>
		</View>
	)
}
