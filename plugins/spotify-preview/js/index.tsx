/*
 * Port of fres621's SpotifyPreview (Vendetta, CC0): https://github.com/fres621/vendetta-plugins
 *
 * Tapping an open.spotify.com link opens a bottom sheet with Spotify's embedded player
 * (30 second previews) instead of leaving the app.
 */

import { ActionSheetActionCreators } from '@valenced/discord/actions'
import { Tokens } from '@valenced/discord/common/tokens'
import { Design } from '@valenced/discord/design'
import { Stores } from '@valenced/discord/flux'
import { BottomSheet } from '@valenced/externals/gorhom'
import { getModules, lookupModule } from '@valenced/modules/finders'
import {
	createFilterGenerator,
	FilterScopes,
	withProps,
} from '@valenced/modules/finders/filters'
import {
	getModuleDependencies,
	isModuleExportBad,
} from '@valenced/modules/metro'
import { instead } from '@valenced/patcher'
import { Linking, ScrollView } from 'react-native'
import type { DiscordModules } from '@valenced/discord/types'
import type { ComponentType } from 'react'

const { ActionSheet } = Design

const SpotifyOrigin = 'https://open.spotify.com/'
const SupportedTypes = ['track', 'playlist', 'episode', 'album']

type ThemeStore = DiscordModules.Flux.Store<{ theme: string }>

interface LinkClickHandler {
	handleClick(args: { href?: string }): unknown
}

interface WebViewProps {
	source: { uri: string }
	injectedJavaScript?: string
	style?: unknown
	nestedScrollEnabled?: boolean
}

type WebViewComponent = ComponentType<WebViewProps>

/** Albums and playlists render a tracklist, which needs more room (and its own scrolling). */
const isList = (type: string) => type === 'playlist' || type === 'album'

/**
 * Spotify's embed shows a "Listen to these tracks & millions more on Spotify / Get Spotify" panel once you press play.
 * This finds its button by text and closes the panel, or hides the button if the panel has no close button.
 */
const HideUpsellScript = `(function () {
	if (window.__spotifyPreviewClean) return;
	window.__spotifyPreviewClean = true;
	var done = new WeakSet();
	function text(el) { return (el.textContent || '').replace(/\\s+/g, ' ').trim(); }
	function dismiss(button) {
		var el = button;
		for (var i = 0; el && el !== document.body && i < 10; i++, el = el.parentElement) {
			var close = el.querySelector('[aria-label*="lose" i],[data-testid*="close" i],[title*="lose" i]');
			if (close && close !== button && !button.contains(close)) { close.click(); return true; }
		}
		return false;
	}
	function scan() {
		var els = document.querySelectorAll('a,button,[role="button"]');
		for (var i = 0; i < els.length; i++) {
			var el = els[i];
			if (done.has(el) || !/^get spotify$/i.test(text(el))) continue;
			done.add(el);
			if (!dismiss(el)) el.style.setProperty('display', 'none', 'important');
		}
	}
	new MutationObserver(scan).observe(document, { childList: true, subtree: true });
	scan();
})();
true;`

const ComponentObjectTypeof = /^Symbol\(react\.(forward_ref|memo|lazy)\)$/

/** Whether React accepts the value as an element type (catch-all proxies and elements are not). */
const isComponent = (value: unknown): value is WebViewComponent => {
	if (typeof value === 'function') return true
	if (typeof value !== 'object' || value === null) return false

	try {
		return ComponentObjectTypeof.test(
			String((value as { $$typeof?: unknown }).$$typeof),
		)
	} catch {
		return false
	}
}

/** Discord's WebView is a forwardRef exported under `default` and `WebView`, whose `render` is the component. */
function resolveWebView(mod: unknown): WebViewComponent | undefined {
	if (isModuleExportBad(mod)) return

	const m = mod as {
		default?: { render?: unknown }
		WebView?: { render?: unknown }
	}

	try {
		return [
			m.default?.render,
			m.WebView?.render,
			m.default,
			m.WebView,
			m,
		].find(isComponent)
	} catch {
		return
	}
}

interface LookupState {
	/** Module ID of `react-native`. */
	native?: number
	/** Modules the loose search has initialized. */
	loose: number
}

/** The loose search guesses, so it's limited in how many modules it may initialize. */
const MaxLooseCandidates = 400

/**
 * Discord loads modules lazily and doesn't load its WebView until something shows one, so `withProps` can't find it yet.
 * The WebView package's index module re-exports the module that has the component, which imports `react-native`.
 * Modules of that shape are initialized one by one until one exports a `WebView`.
 * The loose search doesn't require the `react-native` import.
 */
const withWebViewModule = createFilterGenerator<
	[loose: boolean, state: LookupState]
>(
	([loose, state], id, exports, initialized) => {
		if (initialized) {
			if (isModuleExportBad(exports)) return false
			if (typeof exports !== 'object' && typeof exports !== 'function')
				return false

			return 'WebView' in exports && resolveWebView(exports) !== undefined
		}

		// Compiled modules also depend on a few helpers, so an index module has a handful of dependencies
		const own = getModuleDependencies(id)
		if (!own || own.length > 4) return false

		const matches = own.some(dep => {
			const deps = getModuleDependencies(dep)
			if (!deps || deps.length < 4 || deps.length > 24) return false

			return (
				loose || (state.native !== undefined && deps.includes(state.native))
			)
		})
		if (!matches) return false

		if (loose) {
			if (state.loose >= MaxLooseCandidates) return false
			state.loose++
		}

		return true
	},
	([loose]) => `spotify-preview.webview(${loose ? 'loose' : 'strict'})`,
	FilterScopes.Uninitialized | FilterScopes.Initialized,
)

function findWebView(state: LookupState): WebViewComponent | undefined {
	const [, native] = lookupModule(withProps('AppRegistry', 'Linking')) as [
		unknown,
		number | undefined,
	]
	state.native = native

	for (const loose of [false, true]) {
		if (!loose && native === undefined) continue

		const found = lookupModule(withWebViewModule(loose, state), {
			returnNamespace: true,
		}) as unknown[]

		const WebView = resolveWebView(found[0])
		if (WebView) return WebView
	}
}

function PreviewSheet({
	WebView,
	href,
	type,
}: {
	WebView: WebViewComponent
	href: string
	type: string
}) {
	const { colors, internal } = Tokens.default
	const backgroundColor = colors.MODAL_BACKGROUND
		? internal.resolveSemanticColor(
				(Stores.ThemeStore as ThemeStore).theme,
				colors.MODAL_BACKGROUND,
			)
		: 'transparent'

	const Scroll = (
		isComponent(BottomSheet?.BottomSheetScrollView)
			? BottomSheet.BottomSheetScrollView
			: ScrollView
	) as ComponentType<{ contentContainerStyle?: unknown; children?: unknown }>

	return (
		<ActionSheet>
			<Scroll contentContainerStyle={{ marginBottom: 100 }}>
				<WebView
					injectedJavaScript={HideUpsellScript}
					source={{
						uri: href.replace(SpotifyOrigin, `${SpotifyOrigin}embed/`),
					}}
					style={{
						marginTop: 20,
						backgroundColor,
						height: isList(type) ? 352 : 152,
						width: '100%',
					}}
					nestedScrollEnabled={isList(type)}
				/>
			</Scroll>
		</ActionSheet>
	)
}

export default plugin({
	start({ cleanup, plugin }) {
		const state: LookupState = { loose: 0 }
		let WebView: WebViewComponent | undefined
		let lastOpened = 0

		/**
		 * Opens the preview sheet if `href` is a supported Spotify link.
		 * @returns Whether the link was handled, `false` means Discord should open it as usual.
		 */
		function openPreview(href: unknown): boolean {
			if (typeof href !== 'string' || !href.startsWith(SpotifyOrigin))
				return false

			const type = href.split('/')[3]
			if (!SupportedTypes.includes(type)) return false

			if (!WebView) {
				try {
					WebView = findWebView(state)
				} catch (e) {
					plugin.reportError(e)
				}
			}
			if (!WebView) return false

			// The same press can reach both hooks below, only open one sheet
			const now = Date.now()
			if (now - lastOpened < 1000) return true
			lastOpened = now

			const Player = WebView
			ActionSheetActionCreators.openLazy(
				Promise.resolve({
					default: () => (
						<PreviewSheet WebView={Player} href={href} type={type} />
					),
				}),
				'SpotifyPreview',
				{},
			)

			return true
		}

		// Discord's link press handler
		cleanup(
			getModules(withProps<LinkClickHandler>('handleClick'), module => {
				cleanup(
					instead(module, 'handleClick', function (args, handleClick) {
						if (openPreview(args[0]?.href)) return
						return Reflect.apply(handleClick, this, args)
					}),
				)
			}),
		)

		// Fallback: whichever way Discord decides to open a link, it ends up here
		cleanup(
			instead(Linking, 'openURL', function (args, openURL) {
				if (openPreview(args[0])) return Promise.resolve(true)
				return Reflect.apply(openURL, Linking, args)
			}),
		)
	},
})
