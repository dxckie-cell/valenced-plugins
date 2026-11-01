import Page from '@valenced/components/Page'
import { Design } from '@valenced/discord/design'
import { ScrollView } from 'react-native'
import { BADGES, getStatusLines, type Settings } from './state'

import type { PluginSettingsComponent } from '@valenced/plugins/types'

// A short look at a copied value, so the settings show what was copied.
function preview(value: unknown): string {
	if (typeof value === 'string') return JSON.stringify(value.length > 70 ? `${value.slice(0, 70)}...` : value)
	if (Array.isArray(value)) return `[${value.length}] ${JSON.stringify(value).slice(0, 80)}`
	if (value && typeof value === 'object') return JSON.stringify(value).slice(0, 90)
	return String(value)
}

export const SettingsComponent: PluginSettingsComponent<{ jsonStorage: Settings }> = ({ api }) => {
	// Reads the settings and redraws when they change.
	const settings = (api.jsonStorage.use() ?? {}) as Partial<Settings>

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
				</Design.TableRowGroup>

				<Design.TableRowGroup title="Badge details">
					{BADGES.filter(badge => badge.copyDetails).map(badge => (
						<Design.TableRow
							key={badge.key}
							label={badge.name}
							subLabel={settings.details?.[badge.key] ? 'Copied from a real profile' : 'Built in'}
						/>
					))}
					<Design.TableRow label="The text is built in. To use Discord's exact data instead, open a profile that has the real badge and tap it once." />
				</Design.TableRowGroup>

				{BADGES.filter(badge => settings.details?.[badge.key]).map(badge => (
					<Design.TableRowGroup key={badge.key} title={`${badge.name}: copied fields`}>
						{Object.entries(settings.details![badge.key]).map(([field, value]) => (
							<Design.TableRow key={field} label={`${field}: ${preview(value)}`} />
						))}
					</Design.TableRowGroup>
				))}

				<Design.TableRowGroup title="Status">
					{getStatusLines().map((line, index) => (
						<Design.TableRow key={index} label={line} />
					))}
				</Design.TableRowGroup>
			</Page>
		</ScrollView>
	)
}
