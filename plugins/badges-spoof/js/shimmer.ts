import * as React from 'react'
import { Animated, Easing, StyleSheet, View } from 'react-native'

// Discord's own Nitro sheet picture has a bright flash sweep over the whole badge every few seconds.
// A still picture can't, so the same picture is drawn again on top as a white silhouette (tintColor
// keeps the badge's shape) whose opacity pulses.
export function ShimmerPicture({ Original, imgProps, scale }: { Original: any; imgProps: any; scale?: number }) {
	const pulse = React.useRef(new Animated.Value(0)).current

	React.useEffect(() => {
		const loop = Animated.loop(
			Animated.sequence([
				Animated.delay(3200),
				Animated.timing(pulse, { toValue: 0.8, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
				Animated.timing(pulse, { toValue: 0, duration: 560, easing: Easing.in(Easing.quad), useNativeDriver: true }),
				Animated.delay(300),
			]),
		)
		loop.start()
		return () => loop.stop()
	}, [pulse])

	const flat: any = StyleSheet.flatten(imgProps.style) ?? {}
	const wrapStyle = [flat, scale ? { transform: [...(Array.isArray(flat.transform) ? flat.transform : []), { scale }] } : null]
	const fill = { width: '100%', height: '100%' } as const

	const h = React.createElement
	return h(
		View,
		{ style: wrapStyle as any, pointerEvents: 'none' },
		h(Original, { ...imgProps, __badgesSpoofScaled: true, style: fill }),
		h(Animated.Image as any, {
			__badgesSpoofScaled: true,
			source: imgProps.source,
			resizeMode: imgProps.resizeMode ?? 'contain',
			style: [StyleSheet.absoluteFill, { opacity: pulse, tintColor: '#ffffff' }],
		}),
	)
}
