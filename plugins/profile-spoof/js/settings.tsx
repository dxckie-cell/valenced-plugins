import Page from '@valenced/components/Page'
import { Tokens } from '@valenced/discord/common/tokens'
import { Design } from '@valenced/discord/design'
import { Stores } from '@valenced/discord/flux'
import { getAssetIdByName } from '@valenced/assets'
import { useEffect, useRef, useState } from 'react'
import { Animated, Image, Pressable, ScrollView, Text, View } from 'react-native'
import { parseDate } from './identity'

import { BADGES, LEVEL_KEYS, SMALL_MARK, NITRO_LEVELS, TEXT_FIELDS, getLevel, PLUGIN_VERSION, levelChoices, type Settings } from './state'

import type { PluginSettingsComponent } from '@valenced/plugins/types'

// Theme colours from Discord, with plain fallbacks if they can't be read.
function useColors() {
	const read = (name: string): string | undefined => {
		try {
			const { colors, internal } = (Tokens as any).default
			return colors[name] ? internal.resolveSemanticColor((Stores as any).ThemeStore.theme, colors[name]) : undefined
		} catch {
			return undefined
		}
	}
	const pick = (name: string, fallback: string): string => read(name) ?? fallback
	return {
		card: pick('BACKGROUND_MOD_SUBTLE', '#2b2d31'),
		text: pick('TEXT_NORMAL', '#dbdee1'),
		muted: pick('TEXT_MUTED', '#949ba4'),
		// The colour Discord's own switches turn when on, so the outline follows the theme the same way.
		accent: accentColor(read) ?? '#5865f2',
	}
}

const ACCENT_PATTERNS = [/SWITCH.*(ACTIVE|ON|CHECKED|SELECTED)/, /TOGGLE.*(ACTIVE|ON|CHECKED|SELECTED)/, /^CONTROL_BRAND_FOREGROUND/]
const ACCENT_NAMES = ['BUTTON_BACKGROUND_BRAND', 'BACKGROUND_BRAND']

function accentColor(read: (name: string) => string | undefined): string | undefined {
	let names: string[] = []
	try {
		names = Object.keys((Tokens as any).default.colors)
	} catch {}
	for (const pattern of ACCENT_PATTERNS) {
		for (const name of names.filter(item => pattern.test(item))) {
			const value = read(name)
			if (value) return value
		}
	}
	for (const name of ACCENT_NAMES) {
		const value = read(name)
		if (value) return value
	}
}

type Colors = ReturnType<typeof useColors>

function Tile({
	label,
	uri,
	selected,
	onPress,
	colors,
}: {
	label: string
	uri?: string
	selected: boolean
	onPress: () => void
	colors: Colors
}) {
	return (
		<Pressable
			onPress={onPress}
			style={{
				width: '31%',
				alignItems: 'center',
				paddingVertical: 10,
				paddingHorizontal: 4,
				marginBottom: 10,
				borderRadius: 12,
				backgroundColor: colors.card,
				borderWidth: 2,
				borderColor: selected ? colors.accent : 'transparent',
				opacity: selected ? 1 : 0.55,
			}}
		>
			<View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
				{uri ? (
					<Image
						source={{ uri: uri.replace(SMALL_MARK, '') }}
						style={uri.endsWith(SMALL_MARK) ? { width: 40 * 0.85, height: 40 * 0.85 } : { width: 40, height: 40 }}
						resizeMode="contain"
					/>
				) : (
					<Text style={{ color: colors.muted, fontSize: 22 }}>∅</Text>
				)}
			</View>
			<Text numberOfLines={2} style={{ color: colors.text, fontSize: 12, marginTop: 6, textAlign: 'center' }}>
				{label}
			</Text>
		</Pressable>
	)
}

type TabKey = 'badges' | 'account'

const TABS: { key: TabKey; label: string }[] = [
	{ key: 'badges', label: 'Badges' },
	{ key: 'account', label: 'Account' },
]

const TAB_ICONS: Record<TabKey, string> = { badges: 'StarIcon', account: 'UserIcon' }

const tabIcon = (key: TabKey): number | undefined => {
	try {
		return getAssetIdByName(TAB_ICONS[key]) ?? undefined
	} catch {
		return undefined
	}
}

// Two tabs on one track, with an accent pill that slides to the chosen one.
function TabSwitcher({ tab, onChange, colors }: { tab: TabKey; onChange: (tab: TabKey) => void; colors: Colors }) {
	const [width, setWidth] = useState(0)
	const slide = useRef(new Animated.Value(tab === 'badges' ? 0 : 1)).current
	const half = Math.max(0, (width - 8) / 2)

	useEffect(() => {
		Animated.spring(slide, { toValue: tab === 'badges' ? 0 : 1, useNativeDriver: true, friction: 9, tension: 120 }).start()
	}, [tab, slide])

	return (
		<View
			onLayout={event => setWidth(event.nativeEvent.layout.width)}
			style={{
				flexDirection: 'row',
				marginHorizontal: 16,
				marginTop: 12,
				marginBottom: 4,
				padding: 4,
				borderRadius: 999,
				borderWidth: 1,
				borderColor: colors.muted + '33',
				backgroundColor: colors.card,
			}}
		>
			<Animated.View
				pointerEvents="none"
				style={{
					position: 'absolute',
					top: 4,
					left: 4,
					bottom: 4,
					width: half,
					borderRadius: 999,
					backgroundColor: colors.accent,
					transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [0, half] }) }],
				}}
			/>
			{TABS.map(item => {
				const active = tab === item.key
				const icon = tabIcon(item.key)
				const tint = active ? '#ffffff' : colors.muted
				return (
					<Pressable
						key={item.key}
						accessibilityRole="tab"
						accessibilityState={{ selected: active }}
						onPress={() => onChange(item.key)}
						style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 11 }}
					>
						{icon !== undefined && <Image source={icon} style={{ width: 18, height: 18, tintColor: tint }} />}
						<Text style={{ color: tint, fontSize: 15, fontWeight: '700' }}>{item.label}</Text>
					</Pressable>
				)
			})}
		</View>
	)
}

// Fades and lifts its content in when it appears (the key changes with the tab).
function FadeIn({ children }: { children: React.ReactNode }) {
	const progress = useRef(new Animated.Value(0)).current

	useEffect(() => {
		Animated.timing(progress, { toValue: 1, duration: 220, useNativeDriver: true }).start()
	}, [progress])

	return (
		<Animated.View
			style={{ opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}
		>
			{children}
		</Animated.View>
	)
}

// A section title with a short bar in the theme's accent colour beside it.
function Heading({ text, colors }: { text: string; colors: Colors }) {
	return (
		<View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 20, marginBottom: 10 }}>
			<View style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: colors.accent }} />
			<Text style={{ color: colors.muted, fontSize: 13, fontWeight: '700' }}>{text}</Text>
		</View>
	)
}

const Grid = ({ children }: { children: React.ReactNode }) => (
	<View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 16 }}>
		{children}
	</View>
)

export const SettingsComponent: PluginSettingsComponent<{ jsonStorage: Settings }> = ({ api }) => {
	// Reads the settings and redraws when they change.
	const settings = (api.jsonStorage.use() ?? {}) as Partial<Settings>
	const colors = useColors()
	const [dateError, setDateError] = useState('')
	const [tab, setTab] = useState<TabKey>('badges')
	const hidden = settings.hidden ?? {}
	const texts = settings.texts ?? {}
	const level = NITRO_LEVELS.some(item => item.key === settings.nitroLevel) ? settings.nitroLevel : 'opal'

	const nitro = BADGES.find(badge => badge.key === 'nitro')
	const iconBase = nitro ? nitro.url.replace(/\/[^/]*$/, '') : ''
	const otherFieldBadges = BADGES.filter(badge => badge.key !== 'nitro' && !(LEVEL_KEYS as readonly string[]).includes(badge.key) && TEXT_FIELDS.some(field => field.badge === badge.key))

	const fieldsFor = (key: string) => {
		const list = TEXT_FIELDS.filter(field => field.badge === key)
		if (list.length === 0) return null
		return (
			<View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 12 }}>
				{list.map(field => (
					<Design.TextInput
						key={field.id}
						label={field.label}
						placeholder={field.placeholder}
						size="md"
						value={texts[field.id] ?? ''}
						onChange={(value: string) => api.jsonStorage.set({ texts: { ...(settings.texts ?? {}), [field.id]: value } })}
					/>
				))}
			</View>
		)
	}

	const levelHeading = (text: string) => <Heading text={text} colors={colors} />

	return (
		<ScrollView keyboardShouldPersistTaps="handled">
			<Page>
				<TabSwitcher tab={tab} onChange={setTab} colors={colors} />

				<FadeIn key={tab}>
				{tab === 'badges' && (
					<>
				{levelHeading('BADGES')}
				<Design.TableRowGroup>
					<Design.TableSwitchRow
						label="Hide my real badges"
						subLabel="Only show the badges picked below, not the ones your account really has."
						value={settings.hideReal === true}
						onValueChange={(hideReal: boolean) => api.jsonStorage.set({ hideReal })}
					/>
					<Design.TableSwitchRow
						label="Replace my real badge with the spoofed one"
						subLabel="When you really own a badge that is also added here (Account Age, Gifting, Nitro, Boosting, Streaming, Game Time, Game Variety), show the spoofed one and hide the real one. Turn off to keep your real badge and skip the spoofed copy."
						value={settings.replaceReal !== false}
						onValueChange={(replaceReal: boolean) => api.jsonStorage.set({ replaceReal })}
					/>
					<Design.TableSwitchRow
						label="Use Discord's animated Nitro badge"
						subLabel="Makes Discord treat you as a Nitro subscriber at the level picked below and draw its own animated Nitro badge, as CloudCord does. Turn off to use our still picture."
						value={settings.nativeNitro === true}
						onValueChange={(nativeNitro: boolean) => api.jsonStorage.set({ nativeNitro })}
					/>
					<Design.TableSwitchRow
						label="Show all badges"
						subLabel="Show every badge instead of only the first six."
						value={settings.showAll !== false}
						onValueChange={(showAll: boolean) => api.jsonStorage.set({ showAll })}
					/>
				</Design.TableRowGroup>

				{levelHeading('PICK YOUR BADGES')}
				<Grid>
					{BADGES.map(badge => {
						const isNitro = badge.key === 'nitro'
						return (
							<Tile
								key={badge.key}
								label={badge.key === 'nitro' ? 'Nitro\u200b' : badge.name}
								uri={badge.url}
								colors={colors}
								selected={isNitro ? level !== 'none' && hidden.nitro !== true : hidden[badge.key] !== true}
								onPress={() => {
									if (isNitro && level === 'none') {
										api.jsonStorage.set({ nitroLevel: 'opal', hidden: { ...hidden, nitro: false } })
									} else {
										api.jsonStorage.set({ hidden: { ...hidden, [badge.key]: hidden[badge.key] !== true } })
									}
								}}
							/>
						)
					})}
				</Grid>

				{levelHeading('NITRO LEVEL')}
				<Grid>
					{NITRO_LEVELS.map(item => (
						<Tile
							key={item.key}
							label={item.key === 'starter' ? 'Nitro\u200b' : item.label}
							uri={item.key === 'none' ? undefined : `${iconBase}/nitro-${item.key}.png`}
							colors={colors}
							selected={level === item.key}
							onPress={() => api.jsonStorage.set({ nitroLevel: item.key })}
						/>
					))}
				</Grid>
				{fieldsFor('nitro')}

				{LEVEL_KEYS.map(key => (
					<View key={key}>
						{levelHeading(`${BADGES.find(item => item.key === key)?.name ?? key} LEVEL`.toUpperCase())}
						<Grid>
							{levelChoices(key).map(item => (
								<Tile
									key={item.key}
									label={item.label}
									uri={item.icon}
									colors={colors}
									selected={(settings.levels?.[key] && levelChoices(key).some(c => c.key === settings.levels?.[key]) ? settings.levels[key] : getLevel(key)) === item.key}
									onPress={() => api.jsonStorage.set({ levels: { ...(settings.levels ?? {}), [key]: item.key } })}
								/>
							))}
						</Grid>
						{fieldsFor(key)}
					</View>
				))}

				{otherFieldBadges.map(badge => (
					<View key={badge.key}>
						{levelHeading(`${badge.name} sheet`.toUpperCase())}
						{fieldsFor(badge.key)}
					</View>
				))}

				{levelHeading('ORDER')}
				<Design.TableRowGroup>
					<Design.TableRow
						label="Reset badge order"
						subLabel="Go back to Discord's own order. Hold a badge in Edit Profile and use Go Left / Go Right."
						onPress={() => api.jsonStorage.set({ order: [] })}
					/>
				</Design.TableRowGroup>

					</>
				)}

				{tab === 'account' && (
					<>
				{levelHeading('ACCOUNT')}
				<Design.TableRowGroup>
					<Design.TableSwitchRow
						label="Change my Member Since date"
						subLabel="Only changes what you see on your own profile."
						value={settings.dateEnabled === true}
						onValueChange={(dateEnabled: boolean) => api.jsonStorage.set({ dateEnabled })}
					/>
				</Design.TableRowGroup>
				<View style={{ padding: 12, gap: 12 }}>
					<Design.TextInput
						label="Member Since (DD-MM-YYYY)"
						placeholder="13-05-2016"
						size="md"
						defaultValue={settings.date ?? ''}
						status={dateError ? 'error' : 'default'}
						errorMessage={dateError || undefined}
						onChange={(value: string) => {
							if (value.trim() && !parseDate(value)) {
								setDateError('Enter a valid date as DD-MM-YYYY')
								return
							}
							setDateError('')
							api.jsonStorage.set({ date: value.trim() })
						}}
					/>
					<Design.TextInput
						label="Username"
						placeholder="Leave empty to keep your real username"
						size="md"
						defaultValue={settings.username ?? ''}
						onChange={(username: string) => api.jsonStorage.set({ username })}
					/>
					<Design.TextInput
						label="Display name"
						placeholder="Leave empty to keep your real display name"
						size="md"
						defaultValue={settings.displayName ?? ''}
						onChange={(displayName: string) => api.jsonStorage.set({ displayName })}
					/>
				</View>

					</>
				)}

				{levelHeading('ABOUT')}
				<Design.TableRowGroup>
					<Design.TableRow label={`Profile Spoof ${PLUGIN_VERSION}`} />
				</Design.TableRowGroup>
				</FadeIn>
			</Page>
		</ScrollView>
	)
}
