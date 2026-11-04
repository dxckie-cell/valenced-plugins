import { ActionSheetActionCreators } from '@valenced/discord/actions'
import { Design } from '@valenced/discord/design'
import { Stores } from '@valenced/discord/flux'
import { getModules, lookupModule } from '@valenced/modules/finders'
import {
	createFilterGenerator,
	FilterScopes,
	withName,
	withProps,
} from '@valenced/modules/finders/filters'
import { after, instead } from '@valenced/patcher'
import { React, ReactJSXRuntime } from '@valenced/react'
import { isModuleExportBad } from '@valenced/modules/metro'
import { getErrorStack } from '@valenced/utils/error'
import { cloneElement, useState } from 'react'
import {
	Dimensions,
	Image,
	Linking,
	Pressable,
	ScrollView,
	Text,
	View,
} from 'react-native'
import type { DiscordModules } from '@valenced/discord/types'
import type { PluginCleanupApi } from '@valenced/plugins/types'
import type { FC, ReactElement } from 'react'
import type { GestureResponderEvent, StyleProp, ViewStyle } from 'react-native'

type AnyFn = (...args: any[]) => any

/** Where a press happened, so the viewer can animate out of it. */
interface Point {
	pageX?: number
	pageY?: number
}

interface MediaModalActions {
	openMediaModal(options: {
		initialSources: {
			uri: string
			sourceURI: string
			width: number
			height: number
			guildId?: string
			channelId?: string
		}[]
		initialIndex: number
		originLayout: {
			width: number
			height: number
			x: number
			y: number
			resizeMode: string
		}
	}): void
}

/**
 * Reports a problem with the plugin itself. Reporting an error doesn't disable the plugin,
 * and the console is used until `start` has the real reporter.
 */
let reportError: (e: unknown) => void = e => console.warn('[Picture Links+]', e)

/**
 * Runs fn and reports instead of throwing, so one component missing in this Discord version
 * can't take the other patches down with it.
 */
function safe<T>(label: string, fn: () => T): T | undefined {
	try {
		return fn()
	} catch (e) {
		try {
			reportError(`${label} failed: ${getErrorStack(e)}`)
		} catch {
			// reporting must never break the plugin either
		}
	}
}

// Looked up on first use: it is only needed once something is tapped.
// Discord loads its image viewer lazily, and only on screens that use it (a user's profile does,
// a server's menu doesn't), and Valenced only finds modules that are already loaded. So the viewer
// is picked up as soon as Discord loads it (see `start`), and looked up when it is needed too.
let mediaModal: MediaModalActions | undefined
const getMediaModal = () =>
	(mediaModal ??= lookupModule(
		withProps<MediaModalActions>('openMediaModal'),
	)[0])

// Valenced only finds modules that are already loaded, so the viewer is loaded here by hand:
// modules are initialized one by one, within a time budget, until one exports `openMediaModal`.
// It runs in small slices in the background, and the progress is kept between slices.
const triedModules = new Set<number>()
let viewerSlice = 0
let viewerSearchDone = false

const withViewerModule = createFilterGenerator<[deadline: number]>(
	([deadline], id, exports, initialized) => {
		if (initialized) {
			if (isModuleExportBad(exports)) return false
			if (typeof exports !== 'object' && typeof exports !== 'function')
				return false
			return typeof (exports as any).openMediaModal === 'function'
		}
		if (triedModules.has(id) || Date.now() > deadline) return false
		triedModules.add(id)
		return true
	},
	() => `picture-links.viewer(${viewerSlice++})`,
	FilterScopes.Uninitialized | FilterScopes.Initialized,
)

/** Initializes modules for up to `budget` ms. @returns whether the viewer is loaded now. */
function loadViewerSlice(budget: number): boolean {
	if (mediaModal) return true
	if (viewerSearchDone) return false
	const before = triedModules.size
	try {
		mediaModal = lookupModule(withViewerModule(Date.now() + budget))[0]
	} catch (e) {
		reportError(`loading the viewer failed: ${getErrorStack(e)}`)
		viewerSearchDone = true
		return false
	}
	// nothing new was tried: every module has been looked at
	if (!mediaModal && triedModules.size === before) viewerSearchDone = true
	return !!mediaModal
}

const getChannelId = () =>
	(
		Stores.SelectedChannelStore as DiscordModules.Flux.Store<{
			getChannelId(): string | undefined
		}>
	).getChannelId()

const getGuildId = () =>
	(
		Stores.SelectedGuildStore as DiscordModules.Flux.Store<{
			getGuildId(): string | undefined
		}>
	).getGuildId()

function getImageSize(uri: string) {
	return new Promise<{ width: number; height: number }>((resolve, reject) => {
		Image.getSize(uri, (width, height) => resolve({ width, height }), reject)
	})
}

// The viewer needs the picture's proportions before it can open, and getSize downloads the whole
// image to find them, which can take ages (or never finish). So:
//  - square images (profile pictures, server icons) need no lookup at all,
//  - anything else measures a small 128px copy and scales it up, giving up after PROBE_TIMEOUT and
//    guessing a 16:9 shape instead,
// and the viewer is opened straight away, loading the big image itself.
const PROBE_SIZE = 128
const PROBE_TIMEOUT = 1500
// Images that can't be probed with a small copy are measured as they are, which can be slow.
const DIRECT_TIMEOUT = 3000
// What is asked of Discord's CDN. Bigger sizes are slow to generate and download, and no phone
// screen shows more than this. Animated images are far heavier than still ones.
const MAX_STATIC_SIZE = 2048
const MAX_ANIMATED_SIZE = 1024
const GUESSED_ASPECT = 16 / 9
const CDN_SIZED =
	/^(https?:\/\/(?:cdn\.discordapp\.com|media\.discordapp\.net)\/[^?#]+)\.(webp|gif|png|jpe?g)\?(?:[^#]*&)?size=(\d+)/

interface OpenOptions {
	/** Tried instead when the image can't be measured at all. */
	fallback?: string
	/** The image is square, so it needs no lookup. */
	square?: boolean
	/** Width over height, when it is known from how the image is drawn. */
	aspect?: number
	/** What was tapped, for the diagnostics. */
	label?: string
}

function capSize(src: string) {
	return src.replace(
		/(\.(webp|gif|png|jpe?g)\?(?:[^#]*&)?size=)(\d+)/,
		(_, head: string, ext: string, size: string) =>
			head +
			Math.min(
				Number(size),
				ext === 'gif' ? MAX_ANIMATED_SIZE : MAX_STATIC_SIZE,
			),
	)
}

const withTimeout = <T,>(promise: Promise<T>, ms: number) =>
	new Promise<T | undefined>(resolve => {
		const timer = setTimeout(() => resolve(undefined), ms)
		promise.then(
			value => {
				clearTimeout(timer)
				resolve(value)
			},
			() => {
				clearTimeout(timer)
				resolve(undefined)
			},
		)
	})

async function measure(src: string, { square, aspect }: OpenOptions) {
	const found = CDN_SIZED.exec(src)
	if (!found) {
		const direct = await withTimeout(getImageSize(src), DIRECT_TIMEOUT)
		if (direct) return direct
		return {
			width: MAX_STATIC_SIZE,
			height: Math.round(
				MAX_STATIC_SIZE / (square ? 1 : aspect || GUESSED_ASPECT),
			),
		}
	}

	const target = Number(found[3])
	if (square) return { width: target, height: target }

	const small = await withTimeout(
		getImageSize(`${found[1]}.png?size=${PROBE_SIZE}`),
		PROBE_TIMEOUT,
	)
	if (small) {
		const scale = target / Math.max(small.width, small.height)
		return {
			width: Math.round(small.width * scale),
			height: Math.round(small.height * scale),
		}
	}
	return {
		width: target,
		height: Math.round(target / (aspect || GUESSED_ASPECT)),
	}
}

async function openModal(
	src: string,
	event?: Point,
	options: OpenOptions = {},
): Promise<void> {
	try {
		await openViewer(src, event, options)
	} catch (e) {
		reportError(`open failed: ${getErrorStack(e)}`)
	}
}

async function openViewer(
	src: string,
	event: Point | undefined,
	options: OpenOptions,
): Promise<void> {
	loadViewerSlice(400) // the viewer may not be loaded yet
	const modal = getMediaModal()
	src = capSize(src)

	let size: { width: number; height: number }
	try {
		size = await measure(src, options)
	} catch (e) {
		const { fallback } = options
		if (fallback && fallback !== src)
			return openViewer(fallback, event, { ...options, fallback: undefined })
		console.warn(`[Picture Links+] could not load ${src}`, e)
		return
	}

	if (!modal) {
		// Discord hasn't loaded its viewer, so show the image in a sheet of our own.
		try {
			openImageSheet(src, size.width / size.height)
		} catch {
			await Linking.openURL(src)
		}
		return
	}

	ActionSheetActionCreators.hideActionSheet() // hide user sheet
	modal.openMediaModal({
		initialSources: [
			{
				uri: src,
				sourceURI: src,
				width: size.width,
				height: size.height,
				guildId: getGuildId(),
				channelId: getChannelId(),
			},
		],
		initialIndex: 0,
		originLayout: {
			width: 0, // this would ideally be the size of the small pfp but this proved very hard to implement
			height: 0,
			x: event?.pageX ?? 0,
			y: event?.pageY ?? 0,
			resizeMode: 'fill',
		},
	})
}

// ---------------------------------------------------------------------------------------------
// Image sheet, for when Discord's own viewer isn't loaded
// ---------------------------------------------------------------------------------------------

const { ActionSheet } = Design

// The image is passed as `picture`, not `uri`/`src`/`source`, which the catcher above looks at.
function ImageSheet({
	picture,
	aspect: guessed,
}: {
	picture: string
	aspect: number
}) {
	const [aspect, setAspect] = useState(guessed)
	const [zoomed, setZoomed] = useState(false)
	const { width: screenWidth, height: screenHeight } = Dimensions.get('window')
	const maxHeight = screenHeight * 0.7
	const fitWidth = screenWidth - 32

	buildingSheet++
	try {
		const image = (
			<Image
				source={{ uri: picture }}
				resizeMode="contain"
				// the real shape, once the image has loaded
				onLoad={(e: {
					nativeEvent: { source?: { width: number; height: number } }
				}) => {
					const { width, height } = e.nativeEvent.source ?? {}
					if (width && height) setAspect(width / height)
				}}
				style={
					zoomed
						? { width: fitWidth * 2.5, height: (fitWidth * 2.5) / aspect }
						: {
								width: '100%',
								aspectRatio: aspect,
								maxHeight,
								borderRadius: 12,
							}
				}
			/>
		)

		return (
			<ActionSheet>
				<View style={{ padding: 16, paddingBottom: 48 }}>
					<Pressable onPress={() => setZoomed(z => !z)}>
						{zoomed ? (
							// pan around the enlarged image (pinch also works where the platform allows it)
							<ScrollView
								horizontal
								nestedScrollEnabled
								maximumZoomScale={4}
								style={{ maxHeight }}
							>
								<ScrollView nestedScrollEnabled style={{ maxHeight }}>
									{image}
								</ScrollView>
							</ScrollView>
						) : (
							image
						)}
					</Pressable>
					<View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
						<SheetButton
							label={zoomed ? 'Zoom out' : 'Zoom in'}
							onPress={() => setZoomed(z => !z)}
						/>
						<SheetButton
							label="Open / save"
							onPress={() => void Linking.openURL(picture)}
						/>
					</View>
				</View>
			</ActionSheet>
		)
	} finally {
		buildingSheet--
	}
}

function SheetButton({
	label,
	onPress,
}: {
	label: string
	onPress: () => void
}) {
	return (
		<Pressable
			onPress={onPress}
			style={{
				flex: 1,
				padding: 12,
				borderRadius: 8,
				alignItems: 'center',
				backgroundColor: 'rgba(128,128,128,0.25)',
			}}
		>
			<Text style={{ color: '#fff', fontWeight: '600' }}>{label}</Text>
		</Pressable>
	)
}

function openImageSheet(uri: string, aspect: number) {
	ActionSheetActionCreators.openLazy(
		Promise.resolve({
			default: () => {
				buildingSheet++
				try {
					return <ImageSheet picture={uri} aspect={aspect} />
				} finally {
					buildingSheet--
				}
			},
		}),
		'PictureLinks',
		{},
		'replaceTopSheet',
	)
}

// ---------------------------------------------------------------------------------------------
// Profile pictures
// ---------------------------------------------------------------------------------------------

interface AvatarUser {
	id: string
	guildMemberAvatars?: Record<string, string | undefined>
	// Valenced's own typing only knows the first two parameters
	getAvatarURL?(
		guildId?: string | false | null,
		size?: number,
		canAnimate?: boolean,
	): string | number
}

interface HeaderAvatarProps {
	user: AvatarUser
	style?: StyleProp<ViewStyle>
	guildId?: string
}

const defaultAvatarUrl = (userId: string) =>
	`https://cdn.discordapp.com/embed/avatars/${Number(BigInt(userId) >> BigInt(22)) % 6}.png`

function patchProfilePictures(cleanup: PluginCleanupApi) {
	cleanup(
		getModules(
			withName<FC<HeaderAvatarProps>>('HeaderAvatar'),
			mod =>
				safe('patch HeaderAvatar', () => {
					const module = mod as { default?: FC<HeaderAvatarProps> }
					if (typeof module.default !== 'function')
						throw new Error('HeaderAvatar has no function default export')

					cleanup(
						instead(
							module as { default: FC<HeaderAvatarProps> },
							'default',
							(args, original) => {
								const res = Reflect.apply(
									original,
									undefined,
									args,
								) as ReactElement<{ style?: unknown }> | null

								const [{ user, style, guildId }] = args
								if (!res?.props || !user) return res

								const memberAvatar = guildId
									? user.guildMemberAvatars?.[guildId]
									: undefined
								const guildSpecific =
									typeof memberAvatar === 'string' && memberAvatar
										? `https://cdn.discordapp.com/guilds/${guildId}/users/${user.id}/avatars/${memberAvatar}.${memberAvatar.startsWith('a_') ? 'gif' : 'png'}?size=4096`
										: undefined

								const image = user.getAvatarURL?.(false, 4096, true)
								if (!image) return res

								const url =
									typeof image === 'number'
										? defaultAvatarUrl(user.id)
										: image.replace('.webp', '.png')

								return (
									<Pressable
										onPress={({ nativeEvent }: GestureResponderEvent) =>
											openModal(url, nativeEvent, {
												square: true,
												label: 'avatar',
											})
										}
										onLongPress={({ nativeEvent }: GestureResponderEvent) =>
											guildSpecific &&
											openModal(guildSpecific, nativeEvent, {
												square: true,
												label: 'server avatar',
											})
										}
										style={style}
									>
										{/* the Pressable takes over the layout style */}
										{cloneElement(res, { style: undefined })}
									</Pressable>
								)
							},
						),
					)
				}),
			{ returnNamespace: true },
		),
	)
}

// ---------------------------------------------------------------------------------------------
// Banners and server icons, caught as they are drawn
//
// Discord draws these with components that have no usable name (and the names change between
// versions), so the element is caught instead: anything handed an image on Discord's CDN that is a
// user banner, a server banner (both live under /banners/<id>/) or a large server icon, or a
// banner-named prop. The hooks are on React's element factories, so the check has to be cheap and
// leave everything else alone.
// ---------------------------------------------------------------------------------------------

// The banner image a banner component was given. The prop has been called bannerSource; other
// names and shapes (a plain url, a { uri }, a list of { uri }) are accepted in case Discord changes it.
const BANNER_PROPS = [
	'bannerSource',
	'bannerURL',
	'bannerUrl',
	'bannerUri',
	'bannerImage',
	'banner',
]

// Props that commonly carry an image, checked before anything more expensive.
const IMAGE_PROPS = ['source', 'uri', 'url', 'src']

const DISCORD_CDN =
	/^https?:\/\/(cdn\.discordapp\.com|media\.discordapp\.net)\//
// User banners, bot banners and server banners all live under /banners/<id>/.
const BANNER_URL =
	/^https?:\/\/(cdn|media)\.discordapp\.(com|net)\/(banners\/\d+\/|guilds\/\d+\/users\/\d+\/banners\/)/
const SERVER_ICON_URL =
	/^https?:\/\/(cdn|media)\.discordapp\.(com|net)\/icons\/\d+\//

function uriOf(value: any): string | undefined {
	const uri =
		typeof value === 'string' ? value : (value?.uri ?? value?.[0]?.uri)
	return typeof uri === 'string' ? uri : undefined
}

// A style, a list of styles, or nothing, flattened into one object.
function flattenStyle(style: any): Record<string, any> {
	if (!style || typeof style !== 'object') return {}
	if (!Array.isArray(style)) return style
	return Object.assign({}, ...style.map(flattenStyle))
}

// Icons are drawn everywhere (server list, pickers...), so only a big one opens the viewer.
function looksLarge(props: any): boolean {
	const style = flattenStyle(props?.style)
	for (const value of [
		style.width,
		style.height,
		props?.width,
		props?.height,
		typeof props?.size === 'number' ? props.size : undefined,
	]) {
		if (typeof value === 'number') return value >= 64
	}
	return isLargeIcon(props?.size)
}

interface FoundImage {
	uri: string
	/** Whether this is a server icon, which needs to be big to count. */
	icon: boolean
}

function findImage(props: any): FoundImage | undefined {
	try {
		for (const key of BANNER_PROPS) {
			const uri = uriOf(props?.[key])
			if (uri && /^https?:\/\//.test(uri)) return { uri, icon: false }
		}
		// any other prop (or { uri } inside it) that points at a banner or a server icon on Discord's CDN
		for (const value of Object.values(props ?? {})) {
			const uri = uriOf(value)
			if (!uri) continue
			if (BANNER_URL.test(uri)) return { uri, icon: false }
			if (SERVER_ICON_URL.test(uri)) return { uri, icon: true }
		}
	} catch {
		// a getter that throws
	}
}

// Full-size URL for an image, plus the untouched original as a fallback.
function resolveImage(original: string): { url: string; original: string } {
	// Only rewrite Discord CDN links. Anything else (e.g. custom banner hosts) is used as-is.
	if (!DISCORD_CDN.test(original)) return { url: original, original }

	// Drop every query parameter, then ask for the largest size. Animated images stay animated.
	const base = original.split('?')[0]
	const animated = /\/a_[^/.]+\.webp$/.test(base)
	return {
		url: `${base.replace(/\.webp$/, animated ? '.gif' : '.png')}?size=${animated ? MAX_ANIMATED_SIZE : MAX_STATIC_SIZE}`,
		original,
	}
}

// Above zero while our own sheet builds its image, which must not be made tappable itself.
let buildingSheet = 0

let bannerErrorReported = false

function wrapImage(el: any): any {
	try {
		const props = el?.props
		if (!props || el.type === Pressable || buildingSheet) return el
		if (
			!IMAGE_PROPS.some(key => props[key]) &&
			!BANNER_PROPS.some(key => props[key] !== undefined)
		)
			return el

		const found = findImage(props)
		if (!found) return el
		if (found.icon && !looksLarge(props)) return el

		const image = resolveImage(found.uri)
		const { width, height } = flattenStyle(props.style)
		const aspect =
			typeof width === 'number' && typeof height === 'number' && height > 0
				? width / height
				: undefined

		return (
			<Pressable
				style={props.style}
				onPress={({ nativeEvent }: GestureResponderEvent) =>
					openModal(image.url, nativeEvent, {
						fallback: image.original,
						square: found.icon,
						aspect,
						label: found.icon ? 'el icon' : 'el banner',
					})
				}
			>
				{el}
			</Pressable>
		)
	} catch (e) {
		// this runs for every element, so a persistent failure must not flood the reports
		if (!bannerErrorReported) {
			bannerErrorReported = true
			reportError(`wrap image failed: ${getErrorStack(e)}`)
		}
		return el
	}
}

function patchImages(cleanup: PluginCleanupApi) {
	cleanup(
		after(ReactJSXRuntime, 'jsx', wrapImage),
		after(ReactJSXRuntime, 'jsxs', wrapImage),
		after(React, 'createElement', wrapImage),
	)
}

// ---------------------------------------------------------------------------------------------
// Server icons and banners by component name (fallback)
//
// The element catcher above handles these when it can. This also looks for the components by their
// display names, in case an image is drawn in a way it can't see. Discord gives these components no
// stable export names, so they are found by their display names
// (these are the ones used by Discord 343): GuildIconInner draws the server icon and
// GuildActionSheetHeader draws the banner in the server menu. The icon inside the header has its
// own tap, which wins over the header's, so tapping the icon still opens the icon.
// ---------------------------------------------------------------------------------------------

const SERVER_COMPONENTS = {
	GuildIconInner: 'icon',
	GuildIcon: 'icon',
	GuildActionSheetHeader: 'banner',
} as const

type ServerComponentName = keyof typeof SERVER_COMPONENTS
type ServerKind = (typeof SERVER_COMPONENTS)[ServerComponentName]

function serverComponentName(component: any): ServerComponentName | undefined {
	try {
		// plain function component, memo, or forwardRef
		for (const name of [
			component?.name,
			component?.displayName,
			component?.type?.name,
			component?.type?.displayName,
			component?.render?.name,
			component?.render?.displayName,
		]) {
			if (
				typeof name === 'string' &&
				Object.prototype.hasOwnProperty.call(SERVER_COMPONENTS, name)
			)
				return name as ServerComponentName
		}
	} catch {
		// exotic export with a throwing getter
	}
}

/** Matches modules whose default export is one of the server components above. */
const withServerComponent = createFilterGenerator(
	(_args: [], _id, exports) => serverComponentName(exports) !== undefined,
	() => 'serverComponent',
)

function serverImage(
	kind: ServerKind,
	guild: any,
): { url: string; original: string } | undefined {
	const hash = kind === 'icon' ? guild?.icon : guild?.banner
	if (typeof guild?.id !== 'string' || typeof hash !== 'string' || !hash) return

	const base = `https://cdn.discordapp.com/${kind === 'icon' ? 'icons' : 'banners'}/${guild.id}/${hash}`
	return {
		url: `${base}.${hash.startsWith('a_') ? 'gif' : 'png'}?size=4096`,
		original: `${base}.webp?size=1024`,
	}
}

// Icons are drawn everywhere (server list, pickers...), so only the big one opens the viewer.
function isLargeIcon(size: unknown): boolean {
	if (typeof size === 'string')
		return ['XLARGE', 'XXLARGE', 'XXXLARGE', 'JUMBO'].includes(
			size.toUpperCase(),
		)
	if (typeof size === 'number') return size >= 64
	return false
}

function patchServerImages(cleanup: PluginCleanupApi) {
	const seen = new Set<unknown>()

	cleanup(
		getModules(
			withServerComponent(),
			mod =>
				safe('patch server icons and banners', () => {
					const component: any = (mod as { default?: unknown }).default
					const name = serverComponentName(component)
					if (!name) return
					const kind = SERVER_COMPONENTS[name]

					let owner: Record<string, AnyFn> | undefined
					let key: string | undefined
					if (typeof component === 'function') {
						owner = mod as Record<string, AnyFn>
						key = 'default'
					} else if (typeof component?.type === 'function') {
						owner = component
						key = 'type'
					} else if (typeof component?.render === 'function') {
						owner = component
						key = 'render'
					}
					if (!owner || !key || seen.has(owner)) return
					seen.add(owner)

					cleanup(
						instead(owner, key, (args, original) => {
							const res = Reflect.apply(original, undefined, args)
							if (!res) return res
							if (kind === 'icon' && !isLargeIcon(args[0]?.size)) return res

							const image = serverImage(kind, args[0]?.guild)
							if (!image) return res

							return (
								<Pressable
									onPress={({ nativeEvent }: GestureResponderEvent) =>
										openModal(image.url, nativeEvent, {
											fallback: image.original,
											square: kind === 'icon',
											label: `cmp ${kind}`,
										})
									}
								>
									{res}
								</Pressable>
							)
						}),
					)
				}),
			{ returnNamespace: true },
		),
	)
}

export default plugin({
	start({ cleanup, plugin }) {
		// Discord keeps what it already rendered, so patches added while it runs would only half apply.
		if (plugin.startedLate) {
			plugin.requireReload()
			return
		}

		reportError = e => plugin.reportError(e)

		// Called now if Discord has loaded the viewer already, and later when it does.
		cleanup(
			getModules(withProps<MediaModalActions>('openMediaModal'), exports => {
				mediaModal = exports
			}),
		)

		// Load Discord's viewer in the background, so it is ready by the time something is tapped.
		let timer: ReturnType<typeof setTimeout> | undefined
		const step = () => {
			if (!loadViewerSlice(40)) {
				if (!viewerSearchDone) timer = setTimeout(step, 30)
			}
		}
		timer = setTimeout(step, 2000)
		cleanup(() => clearTimeout(timer))

		safe('patch profile pictures', () => patchProfilePictures(cleanup))
		safe('patch banners and server icons', () => patchImages(cleanup))
		safe('patch server icons and banners', () => patchServerImages(cleanup))
	},
	stop({ plugin }) {
		// What is already on screen keeps its tap handlers until Discord draws it again.
		plugin.requireReload()
	},
})
