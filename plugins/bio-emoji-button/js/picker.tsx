import { getAssetIdByName } from '@valenced/assets'
import { ActionSheetActionCreators, ToastActionCreators } from '@valenced/discord/actions'
import { Tokens } from '@valenced/discord/common/tokens'
import { Design } from '@valenced/discord/design'
import { Stores } from '@valenced/discord/flux'
import { useEffect, useMemo, useRef, useState } from 'react'
import { FlatList, Image, Pressable, Text, TextInput, useWindowDimensions, View } from 'react-native'
import { makeMutable, nativePicker, wholePicker } from './native'

export interface Target {
	value?: string
	maxLength?: number
	onChange?: (text: string) => void
}

interface Item {
	text: string
	name: string
	uri: string
}

const { ActionSheet } = Design

const KEY = 'dxckie.bio-emoji-button'
const COLS = 9
const PAGE = 7

interface Server {
	id: string
	name: string
	icon?: string
}

// The servers you have emoji from, for the jump bar.
function servers(): Server[] {
	const out: Server[] = []
	try {
		for (const [id, guild] of Object.entries<any>((Stores.EmojiStore as any)?.getGuilds?.() ?? {})) {
			const g = (Stores as any).GuildStore?.getGuild?.(id)
			if (!g?.name) continue
			out.push({ id, name: g.name, icon: g.icon ? `https://cdn.discordapp.com/icons/${id}/${g.icon}.png?size=48` : undefined })
		}
	} catch {}
	return out
}

// Discord's list has no usable scroll call for server sections, so the jump drops every section before the server instead.
function sectionIndex(props: Record<string, any>, server: Server): number {
	const rows: any[] = props.data?.data ?? []
	return rows.findIndex(row => row?.guildId === server.id)
}

function color(name: string, fallback: string): string {
	try {
		const { colors, internal } = Tokens.default
		return internal.resolveSemanticColor((Stores.ThemeStore as any).theme, colors[name]) ?? fallback
	} catch {
		return fallback
	}
}

// Every custom emoji from your servers. Bios keep them as <:name:id>. Used for search only.
function customEmoji(): Item[] {
	const items: Item[] = []
	try {
		const guilds = (Stores.EmojiStore as any)?.getGuilds?.() ?? {}
		for (const guild of Object.values<any>(guilds)) {
			const list = guild?.emojis ?? guild?._emojis ?? []
			for (const e of Array.isArray(list) ? list : Object.values<any>(list)) {
				if (!e?.id || !e?.name || e.available === false) continue
				items.push({
					text: `<${e.animated ? 'a' : ''}:${e.name}:${e.id}>`,
					name: e.name,
					uri: `https://cdn.discordapp.com/emojis/${e.id}.webp?size=48&animated=false`,
				})
			}
		}
	} catch {}
	return items
}

function insert(target: { current: Target }, text: string) {
	const { value = '', maxLength, onChange } = target.current
	const next = value + text
	if (maxLength && next.length > maxLength) return
	onChange?.(next)
}

// What Discord's picker hands over: a custom emoji (id, name) or a unicode one (surrogates).
function emojiText(raw: any): string | undefined {
	const e = raw?.emoji ?? raw
	if (e?.id) return `<${e.animated ? 'a' : ''}:${e.name}:${e.id}>`
	return e?.surrogates ?? undefined
}

function Results({ items, width, onPick }: { items: Item[]; width: number; onPick: (item: Item) => void }) {
	const cell = Math.floor((width || 1) / COLS)
	const rows = useMemo(() => {
		const out: Item[][] = []
		for (let i = 0; i < items.length; i += COLS) out.push(items.slice(i, i + COLS))
		return out
	}, [items])
	return (
		<FlatList
			data={rows}
			style={{ flex: 1 }}
			keyboardShouldPersistTaps="handled"
			keyExtractor={(_, i) => String(i)}
			initialNumToRender={12}
			windowSize={7}
			renderItem={({ item }) => (
				<View style={{ flexDirection: 'row', height: cell }}>
					{item.map(it => (
						<Pressable
							key={it.text}
							onPress={() => onPick(it)}
							style={{ width: cell, height: cell, alignItems: 'center', justifyContent: 'center' }}
						>
							<Image source={{ uri: it.uri }} style={{ width: cell * 0.72, height: cell * 0.72 }} />
						</Pressable>
					))}
				</View>
			)}
		/>
	)
}

function NativeSheet({ target, native }: { target: { current: Target }; native: NonNullable<ReturnType<typeof nativePicker>> }) {
	const { height } = useWindowDimensions()
	const [width, setWidth] = useState(0)
	const [query, setQuery] = useState('')
	const all = useMemo(customEmoji, [])
	const q = query.trim().toLowerCase()
	const found = useMemo(() => (q ? all.filter(e => e.name.toLowerCase().includes(q)) : []), [all, q])
	const { List, props } = native
	const bar = useMemo(servers, [])
	const [page, setPage] = useState(0)
	const [start, setStart] = useState(0)
	const data = useMemo(() => {
		const d = props.data
		if (!start || !d) return d
		return {
			...d,
			data: d.data.slice(start),
			headerIndices: (d.headerIndices ?? []).filter((h: number) => h >= start).map((h: number) => h - start),
		}
	}, [props.data, start])
	const pages = Math.max(1, Math.ceil(bar.length / PAGE))

	return (
		<ActionSheet>
			<View style={{ height: height * 0.7 }} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
				<View
					style={{
						marginBottom: 8,
						paddingHorizontal: 12,
						borderRadius: 10,
						borderWidth: 1,
						borderColor: color('BORDER_FAINT', 'rgba(255,255,255,0.15)'),
						backgroundColor: color('BACKGROUND_MOD_SUBTLE', 'rgba(255,255,255,0.08)'),
					}}
				>
					<TextInput
						value={query}
						onChangeText={setQuery}
						placeholder="Find the perfect emoji"
						placeholderTextColor={color('TEXT_MUTED', '#aaa')}
						autoCorrect={false}
						style={{ color: color('TEXT_DEFAULT', '#fff'), fontSize: 16, height: 44 }}
					/>
				</View>
				{q ? (
					<Results items={found} width={width} onPick={item => insert(target, item.text)} />
				) : (
					<View key={start} style={{ flex: 1 }}>
						<List
							{...props}
							data={data}
							__bio
							onPressEmoji={(emoji: any) => {
								const text = emojiText(emoji)
								if (text) insert(target, text)
							}}
							onLongPressEmoji={() => {}}
						/>
					</View>
				)}
				<View style={{ flexDirection: 'row', alignItems: 'center', height: 56 }}>
					<Pressable hitSlop={8} onPress={() => setStart(0)} style={{ width: 28 }}>
						<Text style={{ color: color('TEXT_DEFAULT', '#fff'), fontSize: 20, opacity: start ? 1 : 0.3 }}>⌂</Text>
					</Pressable>
					<Pressable hitSlop={8} onPress={() => setPage(p => Math.max(0, p - 1))} style={{ width: 28 }}>
						<Text style={{ color: color('TEXT_DEFAULT', '#fff'), fontSize: 24, opacity: page ? 1 : 0.3 }}>‹</Text>
					</Pressable>
					<View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-around' }}>
						{bar.slice(page * PAGE, page * PAGE + PAGE).map(s => (
							<Pressable key={s.name} hitSlop={6} onPress={() => {
									const i = sectionIndex(props, s)
									if (i >= 0) setStart(i)
								}}>
								{s.icon ? (
									<Image source={{ uri: s.icon }} style={{ width: 32, height: 32, borderRadius: 16 }} />
								) : (
									<Text style={{ width: 32, textAlign: 'center', color: color('TEXT_DEFAULT', '#fff'), fontSize: 18 }}>{s.name[0]}</Text>
								)}
							</Pressable>
						))}
					</View>
					<Pressable hitSlop={8} onPress={() => setPage(p => Math.min(pages - 1, p + 1))} style={{ width: 28, alignItems: 'flex-end' }}>
						<Text style={{ color: color('TEXT_DEFAULT', '#fff'), fontSize: 24, opacity: page < pages - 1 ? 1 : 0.3 }}>›</Text>
					</Pressable>
				</View>
			</View>
		</ActionSheet>
	)
}

// Any channel will do, the picker only wants one for permissions and favourites.
function anyChannel() {
	const S = Stores as any
	const id = S.SelectedChannelStore?.getChannelId?.() ?? S.SelectedChannelStore?.getMostRecentSelectedTextChannelId?.()
	return (
		(id && S.ChannelStore?.getChannel?.(id)) ||
		Object.values(S.ChannelStore?.getMutablePrivateChannels?.() ?? {})[0]
	)
}

// The chat sheet's ref has these methods, the picker's footer may call them. No-ops, nothing native sees them.
const noop = () => {}
const sheetStub = { snapToIndex: noop, snapToPosition: noop, expand: noop, collapse: noop, close: noop, forceClose: noop }

// Used when the chat picker has not been opened since the app started: the whole picker, built from its module id.
function WholeSheet({ target, Picker }: { target: { current: Target }; Picker: (props: any) => any }) {
	const { height } = useWindowDimensions()
	// A real reanimated value: a look-alike object closes the app, so without reanimated nothing is rendered.
	const index = useMemo(() => makeMutable?.(1), [])
	const sheetRef = useRef<any>(sheetStub)
	return (
		<ActionSheet>
			<View style={{ height: height * 0.7 }}>
				{index ? <Picker
					bottomSheetIndex={index}
					bottomSheetRef={sheetRef}
					channel={anyChannel()}
					inPortalKeyboard={false}
					onBackspace={() => {}}
					onPressEmoji={(emoji: any) => {
						const text = emojiText(emoji)
						if (text) insert(target, text)
					}}
				/> : <Text style={{ color: color('TEXT_DEFAULT', '#fff'), padding: 16 }}>reanimated not found</Text>}
			</View>
		</ActionSheet>
	)
}

// Discord's list as the chat picker rendered it, else the whole picker loaded by its saved module id, else a hint.
export function openPicker(target: { current: Target }) {
	const native = nativePicker()
	const whole = native ? undefined : wholePicker()
	if (!native && !whole) {
		ToastActionCreators.open(KEY, { text: 'Open the emoji picker in a chat once, then try again.' })
		return
	}
	ActionSheetActionCreators.openLazy(
		Promise.resolve({ default: () => <Auto target={target} first={native} Picker={whole} /> }),
		KEY,
		{},
	)
}

// The whole picker makes Discord's list render, which gives us its props. Then the sheet switches to the
// look-alike with the server arrows and home button, same as after opening the chat picker.
function Auto({ target, first, Picker }: { target: { current: Target }; first?: ReturnType<typeof nativePicker>; Picker?: (props: any) => any }) {
	const [native, setNative] = useState(first)
	useEffect(() => {
		if (native) return
		const timer = setInterval(() => {
			const n = nativePicker()
			if (n) setNative(n)
		}, 150)
		return () => clearInterval(timer)
	}, [native])
	return native ? <NativeSheet target={target} native={native} /> : <WholeSheet target={target} Picker={Picker!} />
}

export function EmojiButton({ onPress }: { onPress: () => void }) {
	// Discord's own emoji icon, the emoji text only if the asset is missing.
	const icon = getAssetIdByName('ReactionIcon')
	return (
		<Pressable
			onPress={onPress}
			hitSlop={8}
			accessibilityLabel="Add emoji"
			style={{ position: 'absolute', left: 12, bottom: 8 }}
		>
			{icon ? (
				<Image source={icon} style={{ width: 24, height: 24, tintColor: color('ICON_BRAND', color('TEXT_BRAND', color('INTERACTIVE_NORMAL', '#b5bac1'))) }} />
			) : (
				<Text style={{ fontSize: 22 }}>😀</Text>
			)}
		</Pressable>
	)
}
