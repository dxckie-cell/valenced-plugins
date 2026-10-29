import { Design } from '@valenced/discord/design'
import * as React from 'react'
import * as ReactNative from 'react-native'
import { usePins } from '../lib/state'
import PinList from './PinList'

/** true inside our wrapper, so nested components receiving the same props aren't wrapped twice */
let wrappedContext: React.Context<boolean> | undefined
/** Created on first use: `React` isn't available yet when the plugin bundle is evaluated. */
export const getWrappedContext = () => (wrappedContext ??= React.createContext(false))

type Mode = 'server' | 'local'
let lastMode: Mode = 'server'

const DURATION = 240
const SLIDE = 18
const fill = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const

function Chip({ label, active, onPress }: { label: string; active: any; onPress: () => void }) {
	const { Text } = Design
	return (
		<ReactNative.Pressable
			onPress={onPress}
			style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(128,128,128,0.15)' }}
		>
			<ReactNative.Animated.View
				style={[fill, { backgroundColor: 'rgba(128,128,128,0.3)', opacity: active }]}
			/>
			<ReactNative.Animated.View
				style={{
					paddingHorizontal: 14,
					paddingVertical: 6,
					opacity: active.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }),
				}}
			>
				<Text variant="text-sm/semibold" color="text-default">
					{label}
				</Text>
			</ReactNative.Animated.View>
		</ReactNative.Pressable>
	)
}

/** Wraps Discord's Pins tab with a Server pins / Local pins switch (animated cross-fade + slide). */
export default function PinsPane({ ret }: { ret: any }) {
	const { Animated, Easing, View } = ReactNative
	const Wrapped = getWrappedContext()
	const count = usePins().length
	const [mode, setMode] = React.useState<Mode>(lastMode)
	const [localMounted, setLocalMounted] = React.useState(lastMode === 'local')
	const progress = React.useRef(new Animated.Value(lastMode === 'local' ? 1 : 0)).current

	const pick = (m: Mode) => {
		if (m === mode) return
		lastMode = m
		if (m === 'local') setLocalMounted(true)
		setMode(m)
		Animated.timing(progress, {
			toValue: m === 'local' ? 1 : 0,
			duration: DURATION,
			easing: Easing.out(Easing.cubic),
			useNativeDriver: true,
		}).start()
	}

	const serverActive = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })
	const slide = (from: number, to: number) => ({
		translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [from, to] }),
	})

	return (
		<Wrapped.Provider value={true}>
			<View style={{ flex: 1 }}>
				<View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 8 }}>
					<Chip label="Server pins" active={serverActive} onPress={() => pick('server')} />
					<Chip label={`Local pins (${count})`} active={progress} onPress={() => pick('local')} />
				</View>
				<View style={{ flex: 1 }}>
					<Animated.View
						style={[fill, { opacity: serverActive, transform: [slide(0, -SLIDE)] }]}
						pointerEvents={mode === 'server' ? 'auto' : 'none'}
					>
						{ret}
					</Animated.View>
					{localMounted && (
						<Animated.View
							style={[fill, { opacity: progress, transform: [slide(SLIDE, 0)] }]}
							pointerEvents={mode === 'local' ? 'auto' : 'none'}
						>
							<PinList />
						</Animated.View>
					)}
				</View>
			</View>
		</Wrapped.Provider>
	)
}
