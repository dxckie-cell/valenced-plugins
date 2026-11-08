import Page from '@valenced/components/Page'
import { Tokens } from '@valenced/discord/common/tokens'
import { Design } from '@valenced/discord/design'
import { Stores } from '@valenced/discord/flux'
import { useState } from 'react'
import { Image, Pressable, ScrollView, Text, View } from 'react-native'
import { getConnections, platformLabel, PLATFORMS, type Connection } from './connections'
import { parseDate } from './identity'

import { BADGES, LEVEL_KEYS, SMALL_MARK, NITRO_LEVELS, TEXT_FIELDS, getLevel, PLUGIN_VERSION, levelChoices, type Settings } from './state'

import type { PluginSettingsComponent } from '@valenced/plugins/types'

// Theme colours from Discord, with plain fallbacks if they can't be read. Worked out once per theme,
// since the settings screen draws many times while typing.
let colorCache: { theme: unknown; value: ReturnType<typeof computeColors> } | undefined

function currentTheme(): unknown {
	try {
		return (Stores as any).ThemeStore.theme
	} catch {
		return undefined
	}
}

function computeColors() {
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

function useColors() {
	const theme = currentTheme()
	if (!colorCache || colorCache.theme !== theme) colorCache = { theme, value: computeColors() }
	return colorCache.value
}

// Saves a typed value a moment after typing stops, so each key doesn't redraw Discord's profile.
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>()
function saveLater(key: string, save: () => void) {
	const pending = saveTimers.get(key)
	if (pending) clearTimeout(pending)
	saveTimers.set(
		key,
		setTimeout(() => {
			saveTimers.delete(key)
			save()
		}, 400),
	)
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

type Colors = ReturnType<typeof computeColors>

// A quick pop on tap: a little bigger, then back in steps. Uses state only (Animated crashed here).
function usePop(): [number, () => void] {
	const [scale, setScale] = useState(1)
	return [
		scale,
		() => {
			setScale(1.12)
			setTimeout(() => setScale(1.05), 90)
			setTimeout(() => setScale(1), 180)
		},
	]
}

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
	const [scale, pop] = usePop()
	return (
		<Pressable
			onPress={() => {
				if (!selected) pop()
				onPress()
			}}
			style={{
				width: '31%',
				transform: [{ scale }],
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

function TabButton({ item, active, onChange, colors }: { item: { key: TabKey; label: string }; active: boolean; onChange: (tab: TabKey) => void; colors: Colors }) {
	const [scale, pop] = usePop()
	return (
		<Pressable
			accessibilityRole="tab"
			accessibilityState={{ selected: active }}
			onPress={() => {
				if (!active) pop()
				onChange(item.key)
			}}
			style={{
				flex: 1,
				alignItems: 'center',
				justifyContent: 'center',
				borderRadius: 999,
				paddingVertical: 12,
				backgroundColor: active ? colors.accent : 'transparent',
				elevation: active ? 2 : 0,
				transform: [{ scale }],
			}}
		>
			<Text style={{ color: active ? '#ffffff' : colors.muted, fontSize: 15, fontWeight: '700' }}>{item.label}</Text>
		</Pressable>
	)
}

// Two tabs on one rounded track, the chosen one a filled accent pill.
function TabSwitcher({ tab, onChange, colors }: { tab: TabKey; onChange: (tab: TabKey) => void; colors: Colors }) {
	return (
		<View
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
			{TABS.map(item => (
				<TabButton key={item.key} item={item} active={tab === item.key} onChange={onChange} colors={colors} />
			))}
		</View>
	)
}

// Holds the tab state, so a switch redraws only this and not the (unchanged) tab contents.
function Tabs({ colors, badges, account }: { colors: Colors; badges: React.ReactNode; account: React.ReactNode }) {
	const [tab, setTab] = useState<TabKey>('badges')
	return (
		<>
			<TabSwitcher tab={tab} onChange={setTab} colors={colors} />
			<View style={tab === 'badges' ? undefined : { display: 'none' }}>{badges}</View>
			<View style={tab === 'account' ? undefined : { display: 'none' }}>{account}</View>
		</>
	)
}

// Keeps a value shown straight away when tapped, while the real save (which redraws Discord's profile)
// happens a moment later. Follows `value` again whenever the saved value changes.
function useLocal<T>(value: T, signature: string): [T, (next: T) => void] {
	const [state, setState] = useState({ signature, shown: value })
	if (state.signature !== signature) setState({ signature, shown: value })
	return [state.shown, (next: T) => setState({ signature: state.signature, shown: next })]
}

// A grid of tiles where one is chosen.
function Picker({
	items,
	value,
	saveKey,
	onPick,
	colors,
}: {
	items: { key: string; label: string; uri?: string }[]
	value: string
	saveKey: string
	onPick: (key: string) => void
	colors: Colors
}) {
	const [shown, setShown] = useLocal(value, value)
	return (
		<Grid>
			{items.map(item => (
				<Tile
					key={item.key}
					label={item.label}
					uri={item.uri}
					colors={colors}
					selected={shown === item.key}
					onPress={() => {
						setShown(item.key)
						saveLater(saveKey, () => onPick(item.key))
					}}
				/>
			))}
		</Grid>
	)
}

// The grid of badges to show or hide.
function BadgeGrid({
	hidden,
	level,
	colors,
	save,
}: {
	hidden: Record<string, boolean>
	level: string | undefined
	colors: Colors
	save: (changes: Partial<Settings>) => void
}) {
	const [shown, setShown] = useLocal(hidden, JSON.stringify(hidden) + level)
	return (
		<Grid>
			{BADGES.map(badge => {
				const isNitro = badge.key === 'nitro'
				return (
					<Tile
						key={badge.key}
						label={isNitro ? 'Nitro\u200b' : badge.name}
						uri={badge.url}
						colors={colors}
						selected={isNitro ? level !== 'none' && shown.nitro !== true : shown[badge.key] !== true}
						onPress={() => {
							const next = isNitro && level === 'none' ? { ...shown, nitro: false } : { ...shown, [badge.key]: shown[badge.key] !== true }
							setShown(next)
							saveLater('hidden', () => save(isNitro && level === 'none' ? { nitroLevel: 'opal', hidden: next } : { hidden: next }))
						}}
					/>
				)
			})}
		</Grid>
	)
}

// Adds and removes the connected accounts shown on your own profile.
function ConnectionsEditor({
	list,
	colors,
	onChange,
}: {
	list: Connection[]
	colors: Colors
	onChange: (list: Connection[]) => void
}) {
	const [type, setType] = useState(PLATFORMS[0].type)
	const [name, setName] = useState('')
	const [field, setField] = useState(0)

	const add = () => {
		const trimmed = name.trim()
		if (!trimmed) return
		onChange([...list, { id: `spoof-${Date.now()}`, type, name: trimmed }])
		setName('')
		setField(field + 1)
	}

	return (
		<View style={{ paddingHorizontal: 16, gap: 12 }}>
			<Text style={{ color: colors.muted, fontSize: 13 }}>
				Shown on your own profile on this device only. They are not linked accounts.
			</Text>
			{list.map(item => (
				<View
					key={item.id}
					style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, backgroundColor: colors.card }}
				>
					<View style={{ flex: 1 }}>
						<Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{item.name}</Text>
						<Text style={{ color: colors.muted, fontSize: 13 }}>{platformLabel(item.type)}</Text>
					</View>
					<Pressable accessibilityRole="button" onPress={() => onChange(list.filter(other => other.id !== item.id))}>
						<Text style={{ color: colors.accent, fontSize: 14, fontWeight: '700' }}>Remove</Text>
					</Pressable>
				</View>
			))}
			<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
				{PLATFORMS.map(item => (
					<Pressable
						key={item.type}
						accessibilityRole="button"
						onPress={() => setType(item.type)}
						style={{
							borderRadius: 999,
							borderWidth: 1,
							borderColor: type === item.type ? colors.accent : colors.muted + '55',
							backgroundColor: type === item.type ? colors.accent : colors.card,
							paddingHorizontal: 14,
							paddingVertical: 8,
						}}
					>
						<Text style={{ color: type === item.type ? '#ffffff' : colors.text, fontSize: 14, fontWeight: '600' }}>
							{item.label}
						</Text>
					</Pressable>
				))}
			</ScrollView>
			<Design.TextInput
				key={field}
				label="Username on that account"
				placeholder="For example: moonfight"
				size="md"
				defaultValue=""
				onChange={(value: string) => setName(value)}
			/>
			<Pressable
				accessibilityRole="button"
				onPress={add}
				style={{
					alignItems: 'center',
					borderRadius: 14,
					paddingVertical: 14,
					backgroundColor: name.trim() ? colors.accent : colors.card,
				}}
			>
				<Text style={{ color: name.trim() ? '#ffffff' : colors.muted, fontSize: 15, fontWeight: '700' }}>Add connection</Text>
			</Pressable>
		</View>
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
						defaultValue={texts[field.id] ?? ''}
						onChange={(value: string) =>
							saveLater(field.id, () => api.jsonStorage.set({ texts: { ...((api.jsonStorage.cache as any)?.texts ?? {}), [field.id]: value } }))
						}
					/>
				))}
			</View>
		)
	}

	const levelHeading = (text: string) => <Heading text={text} colors={colors} />

	// Built once per settings change, so switching tab does not redraw them.
	const badgesView = (
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
						label="Show all badges"
						subLabel="Show every badge instead of only the first six."
						value={settings.showAll !== false}
						onValueChange={(showAll: boolean) => api.jsonStorage.set({ showAll })}
					/>
				</Design.TableRowGroup>

				{levelHeading('PICK YOUR BADGES')}
				<BadgeGrid hidden={hidden} level={level} colors={colors} save={changes => api.jsonStorage.set(changes)} />

				{levelHeading('NITRO LEVEL')}
				<Picker
					items={NITRO_LEVELS.map(item => ({
						key: item.key,
						label: item.key === 'starter' ? 'Nitro\u200b' : item.label,
						uri: item.key === 'none' ? undefined : `${iconBase}/nitro-${item.key}.png`,
					}))}
					value={level ?? 'opal'}
					saveKey="nitroLevel"
					onPick={key => api.jsonStorage.set({ nitroLevel: key })}
					colors={colors}
				/>
				{fieldsFor('nitro')}

				{LEVEL_KEYS.map(key => (
					<View key={key}>
						{levelHeading(`${BADGES.find(item => item.key === key)?.name ?? key} LEVEL`.toUpperCase())}
						<Picker
							items={levelChoices(key).map(item => ({ key: item.key, label: item.label, uri: item.icon }))}
							value={settings.levels?.[key] && levelChoices(key).some(c => c.key === settings.levels?.[key]) ? settings.levels[key] : getLevel(key)}
							saveKey={`level-${key}`}
							onPick={choice => api.jsonStorage.set({ levels: { ...((api.jsonStorage.cache as any)?.levels ?? {}), [key]: choice } })}
							colors={colors}
						/>
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
	)

	const accountView = (
		<>
				{levelHeading('ACCOUNT')}
				<View style={{ padding: 12, gap: 12 }}>
					<Design.TextInput
						label="Member Since (DD-MM-YYYY)"
						placeholder="Leave empty to keep your real date (DD-MM-YYYY)"
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
							saveLater('date', () => api.jsonStorage.set({ date: value.trim() }))
						}}
					/>
					<Design.TextInput
						label="Username"
						placeholder="Leave empty to keep your real username"
						size="md"
						defaultValue={settings.username ?? ''}
						onChange={(username: string) => saveLater('username', () => api.jsonStorage.set({ username }))}
					/>
					<Design.TextInput
						label="Display name"
						placeholder="Leave empty to keep your real display name"
						size="md"
						defaultValue={settings.displayName ?? ''}
						onChange={(displayName: string) => saveLater('displayName', () => api.jsonStorage.set({ displayName }))}
					/>
				</View>

				{levelHeading('CONNECTIONS')}
				<ConnectionsEditor
					list={getConnections()}
					colors={colors}
					onChange={connections => api.jsonStorage.set({ connections })}
				/>

		</>
	)

	return (
		<ScrollView keyboardShouldPersistTaps="handled">
			<Page>
				<Tabs colors={colors} badges={badgesView} account={accountView} />

				{levelHeading('ABOUT')}
				<Design.TableRowGroup>
					<Design.TableRow label={`Profile Spoof ${PLUGIN_VERSION}`} />
				</Design.TableRowGroup>
			</Page>
		</ScrollView>
	)
}
