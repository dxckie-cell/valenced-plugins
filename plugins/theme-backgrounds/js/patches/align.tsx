import { getModules } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import { instead } from '@valenced/patcher'
import { useRef, useState } from 'react'
import { type LayoutChangeEvent, StyleSheet, useWindowDimensions, View } from 'react-native'
import type { FunctionComponent } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'

interface GradientProps {
	absolute?: boolean
	mix?: boolean
	wide?: boolean
	tall?: boolean
	style?: StyleProp<ViewStyle>
	gradientOverride?: unknown
}

interface GradientModule {
	default: FunctionComponent<GradientProps>
	CustomThemedGradient: unknown
	validateColors: unknown
}

/**
 * Valenced draws the image in each themed layer from that layer's own top-left corner, so layers that
 * start below the top of the screen (the server header) show the wrong slice of the image.
 * This puts the layer's content in a screen-sized box, moved back by the layer's position on screen.
 * Short layers (the server header strip) draw nothing, so the screen's own background shows through.
 */
// shortcut: any layer under 40% of the screen height counts as a header strip, narrow it if other small layers go missing.
const MaxStripHeight = 0.4
function Aligned({ props, Original }: { props: GradientProps; Original: FunctionComponent<GradientProps> }) {
	const ref = useRef<View>(null)
	const { width, height } = useWindowDimensions()
	const [pos, setPos] = useState({ x: 0, y: 0 })
	const [strip, setStrip] = useState(false)

	const measure = (e: LayoutChangeEvent) => {
		setStrip(e.nativeEvent.layout.height < height * MaxStripHeight)
		ref.current?.measureInWindow((x, y) => {
			if (Number.isFinite(x) && Number.isFinite(y)) setPos(p => (p.x === x && p.y === y ? p : { x, y }))
		})
	}

	return (
		<View
			ref={ref}
			collapsable={false}
			onLayout={measure}
			pointerEvents="none"
			style={[props.absolute ? StyleSheet.absoluteFill : props.style, props.wide && { width }, props.tall && { height }, { overflow: 'hidden' }]}
		>
			{!strip && (
				<View style={{ position: 'absolute', top: -pos.y, left: -pos.x, width, height }}>
					<Original {...props} absolute wide={false} tall={false} style={undefined} />
				</View>
			)}
		</View>
	)
}

export function patchAlignment(cleanup: (fn: () => void) => void) {
	cleanup(
		getModules(
			withProps<GradientModule>('CustomThemedGradient', 'validateColors'),
			module => {
				cleanup(
					instead(module, 'default', (args, Original) => {
						const [props] = args as [GradientProps]
						// Previews and swatches draw their own gradient and are not part of the screen.
						if (props.gradientOverride != null) return <Original {...props} />
						return <Aligned props={props} Original={Original as FunctionComponent<GradientProps>} />
					}),
				)
			},
			{ cached: true },
		),
	)
}
