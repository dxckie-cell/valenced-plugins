import { getModules } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import { instead } from '@valenced/patcher'
import type { FunctionComponent } from 'react'

interface GradientProps {
	mix?: boolean
	tall?: boolean
	gradientOverride?: unknown
}

interface GradientModule {
	default: FunctionComponent<GradientProps>
	CustomThemedGradient: unknown
	validateColors: unknown
}

/**
 * Valenced draws the image in the server header from the header's own top-left corner, so it shows a bright,
 * shifted slice. Read off a phone: the screen's own layer is absolute only, the header's is absolute and tall.
 * That layer draws nothing, so the screen's own background shows through.
 * shortcut: any other plain tall layer goes too, narrow this if some screen loses its background.
 */
export function patchHeaderLayer(cleanup: (fn: () => void) => void) {
	cleanup(
		getModules(
			withProps<GradientModule>('CustomThemedGradient', 'validateColors'),
			module => {
				cleanup(
					instead(module, 'default', (args, Original) => {
						const [props] = args as [GradientProps]
						// Previews and swatches draw their own gradient and are not part of the screen.
						if (props.gradientOverride == null && !props.mix && props.tall) return null
						return <Original {...props} />
					}),
				)
			},
			{ cached: true },
		),
	)
}
