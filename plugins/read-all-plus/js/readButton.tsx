import { getAssetIdByName } from '@valenced/assets'
import { AlertActionCreators, ToastActionCreators } from '@valenced/discord/actions'
import { Design } from '@valenced/discord/design'
import { Dispatcher, Stores } from '@valenced/discord/flux'
import { lookupModule } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import { Image, Pressable, StyleSheet, View } from 'react-native'
import { isDMExcluded, isServerExcluded } from './state'
import { useThemeColors } from './theme'

// Matches the native "+" tile in the guild bar; colors come from the current theme (see theme.ts).
const TILE = 48
const MARGIN = 4

export const FOOTER_EXTRA = TILE + 2 * MARGIN

const ALERT_KEY = 'read-all-plus-options'
const EYE_ICONS = ['EyeIcon', 'ic_visibility', 'ic_visibility_24px', 'ic_eye', 'ic_show_password']

type Mode = 'all' | 'servers' | 'dms'

function toast(text: string) {
	try {
		const creators = ToastActionCreators as any
		if (typeof creators.openMana === 'function') creators.openMana('ReadAllPlusToast', { text })
		else creators.open({ key: 'ReadAllPlusToast', content: text }, { text })
	} catch {
		/* a missing toast must never crash */
	}
}

const store = (name: string): any => {
	try {
		return (Stores as any)[name]
	} catch {
		return undefined
	}
}

function getUnreadChannels(mode: Mode) {
	const GuildStore = store('GuildStore')
	const ChannelStore = store('ChannelStore')
	const GuildChannelStore = store('GuildChannelStore') ?? ChannelStore
	const ReadStateStore = store('ReadStateStore')
	if (!ReadStateStore) return []

	const unread: { channelId: string; messageId: string | null; readStateType: number }[] = []
	const addIfUnread = (channel: any) => {
		if (!channel?.id || !ReadStateStore.hasUnread?.(channel.id)) return
		unread.push({
			channelId: channel.id,
			messageId: ReadStateStore.lastMessageId?.(channel.id) || null,
			readStateType: 0,
		})
	}

	if (mode !== 'dms' && GuildStore) {
		for (const guild of Object.values<any>(GuildStore.getGuilds())) {
			if (!guild?.id || isServerExcluded(guild.id)) continue
			try {
				const data = GuildChannelStore?.getChannels?.(guild.id)
				for (const c of [...(data?.SELECTABLE ?? []), ...(data?.VOCAL ?? [])]) {
					addIfUnread(c?.channel || c)
				}
			} catch {}
		}
	}

	if (mode !== 'servers') {
		try {
			for (const channel of Object.values<any>(ChannelStore?.getPrivateChannels?.() ?? {})) {
				if (channel?.id && !isDMExcluded(channel.id)) addIfUnread(channel)
			}
		} catch {}
	}

	return unread
}

const isDispatcher = (d: any) => !!d && typeof d.dispatch === 'function' && typeof d.subscribe === 'function'

/** Finds Discord's Flux dispatcher, trying the exported one first. */
function getDispatcher(): any {
	const attempts: (() => any)[] = [
		() => Dispatcher,
		() => {
			const found: any = lookupModule(withProps('dispatch', 'subscribe', 'wait'))
			const mod = Array.isArray(found) ? found[0] : found
			return mod?.dispatch ? mod : mod?.default
		},
	]
	for (const attempt of attempts) {
		try {
			const d = attempt()
			if (isDispatcher(d)) return d
		} catch {}
	}
}

function markRead(mode: Mode) {
	try {
		if (!store('ReadStateStore')) return toast("Read All: couldn't find Discord's read state")

		const channels = getUnreadChannels(mode)
		if (channels.length === 0) return toast('No unread notifications!')

		const dispatcher = getDispatcher()
		if (!dispatcher) return toast("Read All: couldn't find Discord's dispatcher")

		dispatcher.dispatch({ type: 'BULK_ACK', context: 'APP', channels })
		toast(`Cleared ${channels.length} unread!`)
	} catch (e: any) {
		toast(`Read All failed: ${e?.message ?? e}`)
	}
}

function eyeIcon() {
	for (const name of EYE_ICONS) {
		try {
			const id = getAssetIdByName(name)
			if (id !== undefined) return id
		} catch {}
	}
}

function openOptions() {
	try {
		showOptions()
	} catch (e: any) {
		toast(`Read All failed: ${e?.message ?? e}`)
	}
}

function showOptions() {
	const { AlertModal, AlertActionButton } = Design
	const close = () => AlertActionCreators.dismissAlert(ALERT_KEY)
	const run = (mode: Mode) => () => {
		close()
		markRead(mode)
	}

	AlertActionCreators.openAlert(
		ALERT_KEY,
		<AlertModal
			title="👁️ Read All Options"
			content="Choose what you want to mark as read:"
			actions={
				<>
					<AlertActionButton text="Mark All Read" onPress={run('all')} />
					<AlertActionButton text="Servers Only" variant="secondary" onPress={run('servers')} />
					<AlertActionButton text="DMs Only" variant="secondary" onPress={run('dms')} />
					<AlertActionButton text="Cancel" variant="destructive" onPress={close} />
				</>
			}
		/>,
	)
}

export default function ReadButton() {
	const colors = useThemeColors()
	const icon = eyeIcon()

	return (
		<View style={st.row}>
			<Pressable onPress={openOptions} accessibilityRole="button" accessibilityLabel="Read All Options">
				<View style={[st.tile, { backgroundColor: colors.tile }]}>
					<View style={[st.circle, { backgroundColor: colors.circle }]}>
						{icon !== undefined && (
							<Image source={icon} style={[st.eye, { tintColor: colors.glyph }]} />
						)}
					</View>
				</View>
			</Pressable>
		</View>
	)
}

const st = StyleSheet.create({
	row: {
		alignSelf: 'stretch',
		alignItems: 'center',
		paddingVertical: MARGIN,
	},
	tile: {
		width: TILE,
		height: TILE,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
	circle: {
		width: 22,
		height: 22,
		borderRadius: 11,
		alignItems: 'center',
		justifyContent: 'center',
	},
	eye: {
		width: 15,
		height: 15,
	},
})
