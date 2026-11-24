import { Design } from '@valenced/discord/design'
import { useRef } from 'react'
import { Dimensions, Image, PanResponder, StyleSheet, View } from 'react-native'
import { centreOf, cropRect } from '../lib/crop'
import type { Background } from '../lib/storage'

const FRAME_WIDTH = 220

interface Props {
	value: Background
	onPan: (x: number, y: number) => void
}

/** Shows what the screen will look like. Drag the image to move it. */
export default function Preview({ value, onPan }: Props) {
	const { Text } = Design
	const { width, height } = Dimensions.get('window')
	const aspect = width / height
	const frameHeight = Math.round(FRAME_WIDTH / aspect)

	// Cropped with the same maths as the real background, so the preview and the result match.
	const rect = cropRect(value, aspect)
	const scale = FRAME_WIDTH / rect.width

	const live = useRef({ value, scale, onPan })
	live.current = { value, scale, onPan }
	const origin = useRef({ x: 0.5, y: 0.5 })

	const pan = useRef(
		PanResponder.create({
			onStartShouldSetPanResponder: () => true,
			onMoveShouldSetPanResponder: () => true,
			onPanResponderTerminationRequest: () => false,
			onPanResponderGrant: () => {
				const { value: v } = live.current
				origin.current = { x: v.x, y: v.y }
			},
			onPanResponderMove: (_, g) => {
				const { value: v, scale: s, onPan: emit } = live.current
				// Dragging right shows more of the left side, so the centre moves the other way.
				const next = { ...v, x: origin.current.x - g.dx / s / v.width, y: origin.current.y - g.dy / s / v.height }
				const c = centreOf(v, cropRect(next, aspect))
				emit(c.x, c.y)
			},
		}),
	).current

	return (
		<View style={{ alignItems: 'center', paddingVertical: 12 }}>
			<View
				{...pan.panHandlers}
				style={{ width: FRAME_WIDTH, height: frameHeight, overflow: 'hidden', borderRadius: 16, backgroundColor: '#000' }}
			>
				<Image
					source={{ uri: value.url }}
					blurRadius={value.blur}
					style={{
						position: 'absolute',
						width: value.width * scale,
						height: value.height * scale,
						left: -rect.left * scale,
						top: -rect.top * scale,
						opacity: value.opacity,
					}}
				/>
				{/* Discord draws its surfaces over the image at this opacity. */}
				<View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#14101e', opacity: value.dimming }]} />
				<View pointerEvents="none" style={{ position: 'absolute', left: 12, right: 12, top: 24, gap: 10 }}>
					<Text variant="text-sm/semibold" color="text-default">Preview chat</Text>
					<Text variant="text-sm/medium" color="text-default">Hello! How does this look?</Text>
					<Text variant="text-sm/medium" color="text-muted">Dimming controls how readable text stays.</Text>
				</View>
			</View>
			<Text variant="text-xs/medium" color="text-muted" style={{ marginTop: 8 }}>
				Drag the image to move it. This is an approximation of Discord's own tint.
			</Text>
		</View>
	)
}
