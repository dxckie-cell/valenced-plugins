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

/** Makes the server header's surface fully transparent, so the image shows through unchanged. */
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
							return `${result.slice(0, 7)}00`
						return result
					}),
				)
			},
			{ cached: true },
		),
	)
}
