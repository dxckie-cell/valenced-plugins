import Page from '@valenced/components/Page'
import { Tokens } from '@valenced/discord/common/tokens'
import { Design } from '@valenced/discord/design'
import { Stores } from '@valenced/discord/flux'
import { Image, Pressable, ScrollView, Text, View } from 'react-native'
import { BADGES, NITRO_LEVELS, TEXT_FIELDS, getStatusLines, type Settings } from './state'

import type { PluginSettingsComponent } from '@valenced/plugins/types'

// Theme colours from Discord, with plain fallbacks if they can't be read.
function useColors() {
	const pick = (name: string, fallback: string): string => {
		try {
			const { colors, internal } = (Tokens as any).default
			return colors[name]
				? internal.resolveSemanticColor((Stores as any).ThemeStore.theme, colors[name])
				: fallback
		} catch {
			return fallback
		}
	}
	return {
		card: pick('BACKGROUND_MOD_SUBTLE', '#2b2d31'),
		text: pick('TEXT_NORMAL', '#dbdee1'),
		muted: pick('TEXT_MUTED', '#949ba4'),
		accent: pick('BUTTON_BACKGROUND_BRAND', '#5865f2'),
	}
}

type Colors = ReturnType<typeof useColors>

function Tile({
	label,
	uri,
	selected,
	onPress,
	colors,
}: {
	label: string
	uri?: string
	selected: boolean
	onPress: () => void
	colors: Colors
}) {
	return (
		<Pressable
			onPress={onPress}
			style={{
				width: '31%',
				alignItems: 'center',
				paddingVertical: 10,
				paddingHorizontal: 4,
				marginBottom: 10,
				borderRadius: 12,
				backgroundColor: colors.card,
				borderWidth: 2,
				borderColor: selected ? colors.accent : 'transparent',
				opacity: selected ? 1 : 0.55,
			}}
		>
			<View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
				{uri ? (
					<Image source={{ uri }} style={{ width: 40, height: 40 }} resizeMode="contain" />
				) : (
					<Text style={{ color: colors.muted, fontSize: 22 }}>∅</Text>
				)}
			</View>
			<Text numberOfLines={2} style={{ color: colors.text, fontSize: 12, marginTop: 6, textAlign: 'center' }}>
				{label}
			</Text>
		</Pressable>
	)
}

const Grid = ({ children }: { children: React.ReactNode }) => (
	<View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 16 }}>
		{children}
	</View>
)

export const SettingsComponent: PluginSettingsComponent<{ jsonStorage: Settings }> = ({ api }) => {
	// Reads the settings and redraws when they change.
	const settings = (api.jsonStorage.use() ?? {}) as Partial<Settings>
	const colors = useColors()
	const hidden = settings.hidden ?? {}
	const texts = settings.texts ?? {}
	const level = NITRO_LEVELS.some(item => item.key === settings.nitroLevel) ? settings.nitroLevel : 'opal'

	const nitro = BADGES.find(badge => badge.key === 'nitro')
	const iconBase = nitro ? nitro.url.replace(/\/[^/]*$/, '') : ''
	const fieldBadges = BADGES.filter(badge => TEXT_FIELDS.some(field => field.badge === badge.key))

	return (
		<ScrollView keyboardShouldPersistTaps="handled">
			<Page>
				<Design.TableRowGroup title="Badges">
					<Design.TableSwitchRow
						label="Hide my real badges"
						subLabel="Only show the badges picked below, not the ones your account really has."
						value={settings.hideReal === true}
						onValueChange={(hideReal: boolean) => api.jsonStorage.set({ hideReal })}
					/>
					<Design.TableSwitchRow
						label="Show all badges"
						subLabel="Show every badge instead of only the first six."
						value={settings.showAll !== false}
						onValueChange={(showAll: boolean) => api.jsonStorage.set({ showAll })}
					/>
				</Design.TableRowGroup>

				<Text style={{ color: colors.muted, fontSize: 12, fontWeight: '600', margin: 16, marginBottom: 8 }}>
					PICK YOUR BADGES
				</Text>
				<Grid>
					{BADGES.map(badge => {
						const isNitro = badge.key === 'nitro'
						return (
							<Tile
								key={badge.key}
								label={badge.name}
								uri={badge.url}
								colors={colors}
								selected={isNitro ? level !== 'none' && hidden.nitro !== true : hidden[badge.key] !== true}
								onPress={() => {
									if (isNitro && level === 'none') {
										api.jsonStorage.set({ nitroLevel: 'opal', hidden: { ...hidden, nitro: false } })
									} else {
										api.jsonStorage.set({ hidden: { ...hidden, [badge.key]: hidden[badge.key] !== true } })
									}
								}}
							/>
						)
					})}
				</Grid>

				<Text style={{ color: colors.muted, fontSize: 12, fontWeight: '600', margin: 16, marginBottom: 8 }}>
					NITRO LEVEL
				</Text>
				<Grid>
					{NITRO_LEVELS.map(item => (
						<Tile
							key={item.key}
							label={item.label}
							uri={item.key === 'none' ? undefined : `${iconBase}/nitro-${item.key}.png`}
							colors={colors}
							selected={level === item.key}
							onPress={() => api.jsonStorage.set({ nitroLevel: item.key })}
						/>
					))}
				</Grid>

				{fieldBadges.map(badge => (
					<Design.TableRowGroup key={badge.key} title={`${badge.name} sheet`}>
						<View style={{ padding: 12, gap: 12 }}>
							{TEXT_FIELDS.filter(field => field.badge === badge.key).map(field => (
								<Design.TextInput
									key={field.id}
									label={field.label}
									placeholder={field.placeholder}
									size="md"
									value={texts[field.id] ?? ''}
									onChange={(value: string) =>
										api.jsonStorage.set({ texts: { ...(settings.texts ?? {}), [field.id]: value } })
									}
								/>
							))}
						</View>
					</Design.TableRowGroup>
				))}

				<Design.TableRowGroup title="Order">
					<Design.TableRow
						label="Reset badge order"
						subLabel="Go back to Discord's own order. Hold a badge in Edit Profile and use Go Left / Go Right."
						onPress={() => api.jsonStorage.set({ order: [] })}
					/>
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
