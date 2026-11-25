import { getModules } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import { instead } from '@valenced/patcher'

interface TokensModule {
	RawColor: unknown
	SemanticColor: unknown
	default: {
		internal: {
			getSemanticColorName(color: object): string
			resolveSemanticColor(theme: unknown, color: object, context?: { gradient?: unknown }): string
		}
	}
}

/** The server header's surface. Valenced dims it over the image, which leaves a darker slab. */
const HeaderSurface = 'BACKGROUND_BASE_LOW'

/** Share of the usual dimming the header surface keeps. 0 is fully clear, so the header looks like the channel list. */
// shortcut: fixed share chosen by eye, make it a setting if it needs tuning per image.
const KeepShare = 0

/** Makes the server header's surface mostly transparent, so the image shows through. */
export function patchHeaderSurface(cleanup: (fn: () => void) => void) {
	cleanup(
		getModules(
			withProps<TokensModule>('RawColor', 'SemanticColor'),
			tokens => {
				const { internal } = tokens.default
				cleanup(
					instead(internal, 'resolveSemanticColor', (args, original) => {
						const result = Reflect.apply(original, internal, args) as string
						const [, color, context] = args
						// Only gradient surfaces, which are the ones drawn over the background image.
						if (context?.gradient && /^#[0-9a-f]{8}$/i.test(result) && internal.getSemanticColorName(color) === HeaderSurface)
							return result.slice(0, 7) + Math.round(Number.parseInt(result.slice(7), 16) * KeepShare).toString(16).padStart(2, '0')
						return result
					}),
				)
			},
			{ cached: true },
		),
	)
}
