import Page from '@valenced/components/Page'
import { Design } from '@valenced/discord/design'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { orderedBadges } from './badges'
import { getStatusLines, type Settings } from './state'

import type { PluginSettingsComponent } from '@valenced/plugins/types'

const ARROW = { paddingHorizontal: 14, paddingVertical: 6 }
const ARROW_TEXT = { fontSize: 18, color: '#b5bac1' }

export const SettingsComponent: PluginSettingsComponent<{ jsonStorage: Settings }> = ({ api }) => {
	// Reads the settings and redraws when they change.
	const settings = (api.jsonStorage.use() ?? {}) as Partial<Settings>

	const badges = orderedBadges()
	const move = (index: number, to: number) => {
		const ids = badges.map(badge => badge.id)
		;[ids[index], ids[to]] = [ids[to], ids[index]]
		api.jsonStorage.set({ order: ids })
	}

	return (
		<ScrollView keyboardShouldPersistTaps="handled">
			<Page>
				<Design.TableRowGroup>
					<Design.TableSwitchRow
						label="Show all badges"
						subLabel="Show every badge instead of only the first six. Hide or show badges from Edit Profile."
						value={settings.showAll !== false}
						onValueChange={(showAll: boolean) => api.jsonStorage.set({ showAll })}
					/>
					<Design.TableRow
						label="Reset badge order"
						subLabel="Go back to Discord's own order. Reorder with the arrows below."
						onPress={() => api.jsonStorage.set({ order: [] })}
					/>
				</Design.TableRowGroup>

				<Design.TableRowGroup title="Badge order">
					{badges.map((badge, index) => (
						<View key={badge.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
							<View style={{ flex: 1 }}>
								<Design.TableRow label={`${index + 1}. ${badge.name}`} />
							</View>
							<Pressable disabled={index === 0} onPress={() => move(index, index - 1)} style={[ARROW, index === 0 && { opacity: 0.3 }]}>
								<Text style={ARROW_TEXT}>▲</Text>
							</Pressable>
							<Pressable disabled={index === badges.length - 1} onPress={() => move(index, index + 1)} style={[ARROW, index === badges.length - 1 && { opacity: 0.3 }]}>
								<Text style={ARROW_TEXT}>▼</Text>
							</Pressable>
						</View>
					))}
					<Design.TableRow label="Your real badges are listed once they have shown on your profile or in Edit Profile." />
				</Design.TableRowGroup>

				<Design.TableRowGroup title="Status">
					{getStatusLines().map((line, index) => (
						<Design.TableRow key={index} label={line} />
					))}
				</Design.TableRowGroup>
			</Page>
		</ScrollView>
	)
}
