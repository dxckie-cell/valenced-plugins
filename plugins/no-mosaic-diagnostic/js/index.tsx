// NoMosaic Diagnostic: temporary helper for porting Vencord's NoMosaic. It lists the Discord modules
// that look related to the media grid and, once a chat with images has rendered, which props they get.
// Open a chat that has several images or videos, then open this plugin's page and copy the report.

import Page from '@valenced/components/Page'
import { Design } from '@valenced/discord/design'
import { Clipboard } from '@valenced/externals/react-native-clipboard'
import { React, ReactJSXRuntime } from '@valenced/react'
import { useState } from 'react'
import { ScrollView } from 'react-native'

import { output, report, scanModule, startElementProbe } from './scan'

const SettingsComponent = () => {
	const [, refresh] = useState(0)
	return (
		<ScrollView>
			<Page>
				<Design.TableRowGroup title="Report">
					<Design.TableRow label="Open a chat with several images, then tap Refresh" />
					<Design.TableRow label="Refresh" onPress={() => refresh(n => n + 1)} />
					<Design.TableRow label="Copy report" onPress={() => Clipboard.setString(output().join('\n'))} />
				</Design.TableRowGroup>
				<Design.TableRowGroup title={`Findings (${report.length})`}>
					{output().map((line, index) => (
						<Design.TableRow key={index} label={line} />
					))}
				</Design.TableRowGroup>
			</Page>
		</ScrollView>
	)
}

export default plugin({
	SettingsComponent,

	start({ cleanup, plugin }) {
		report.length = 0
		const metro = valenced.modules.metro as any
		const patcher = valenced.patcher as any
		const scan = (id: number | string, exports: any) => scanModule(id, exports, patcher, cleanup)

		// Modules load lazily (the chat's media code loads when a chat opens), so scan now and keep scanning.
		const walk = () => {
			for (let id = 0; id < 40000; id++) {
				try {
					if (metro.isModuleInitialized(id)) scan(id, metro.getInitializedModuleExports(id))
				} catch {}
			}
		}

		try {
			// Names the component that is handed the list of media items. It removes itself after a few hits.
			startElementProbe(
				[
					[ReactJSXRuntime, 'jsx'],
					[ReactJSXRuntime, 'jsxs'],
					[React, 'createElement'],
				],
				patcher,
				metro,
				cleanup,
			)
			walk()
			const stop = metro.onAnyModuleInitialized((id: any, exports: any) => scan(id, exports))
			if (typeof stop === 'function') cleanup(stop)
			let passes = 0
			const timer = setInterval(() => (++passes > 10 ? clearInterval(timer) : walk()), 3000)
			cleanup(() => clearInterval(timer))
		} catch (error) {
			plugin.reportError(error)
		}
	},
})
