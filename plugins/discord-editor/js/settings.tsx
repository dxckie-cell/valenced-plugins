import Page from '@valenced/components/Page'
import { Design } from '@valenced/discord/design'
import { useEffect, useState } from 'react'
import { ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { DEFAULT_SETTINGS, HEX, PREVIEW_DEFAULTS, type Settings } from './state'

import type { PluginSettingsComponent } from '@valenced/plugins/types'

const SWATCHES = [
	'#5865F2',
	'#1ABC9C',
	'#E67E22',
	'#3498DB',
	'#00E5FF',
	'#F1C40F',
	'#EB459E',
	'#ED4245',
	'#57F287',
	'#FFFFFF',
]

const good = (value: string, fallback: string) => (HEX.test(value.trim()) ? value.trim() : fallback)

function ColorField({
	label,
	value,
	fallback,
	onChange,
}: {
	label: string
	value: string
	fallback: string
	onChange: (value: string) => void
}) {
	const invalid = value.trim() !== '' && !HEX.test(value.trim())

	return (
		<View>
			<Design.TextInput
				label={label}
				placeholder={fallback}
				value={value}
				onChange={onChange}
				isError={invalid}
				description={invalid ? 'Invalid hex color, e.g. #5865F2' : undefined}
			/>
			<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12 }}>
				{SWATCHES.map(color => (
					<TouchableOpacity
						key={color}
						onPress={() => onChange(color)}
						style={{
							width: 24,
							height: 24,
							borderRadius: 12,
							backgroundColor: color,
							borderWidth: value.toLowerCase() === color.toLowerCase() ? 2 : 0,
							borderColor: '#FFFFFF',
						}}
					/>
				))}
			</View>
		</View>
	)
}

function Preview({ values }: { values: Settings }) {
	const name = values.name.trim() || PREVIEW_DEFAULTS.name
	const nameColor = good(values.nameColor, PREVIEW_DEFAULTS.nameColor)
	const badgeBg = good(values.badgeBgColor, PREVIEW_DEFAULTS.badgeBgColor)
	const badgeFg = good(values.badgeTextColor, PREVIEW_DEFAULTS.badgeTextColor)
	const badgeText = values.badgeText.trim() || PREVIEW_DEFAULTS.badgeText

	return (
		<View style={{ padding: 14, borderRadius: 12, backgroundColor: '#2B2D31' }}>
			<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
				<Text style={{ color: nameColor, fontWeight: '700', fontSize: 16 }}>{name}</Text>
				<View
					style={{
						flexDirection: 'row',
						alignItems: 'center',
						gap: 3,
						paddingHorizontal: 5,
						borderRadius: 4,
						backgroundColor: badgeBg,
					}}
				>
					{values.verified && <Text style={{ color: '#FFFFFF', fontSize: 11 }}>✓</Text>}
					<Text style={{ color: badgeFg, fontSize: 11, fontWeight: '700' }}>{badgeText}</Text>
				</View>
			</View>
		</View>
	)
}

export const SettingsComponent: PluginSettingsComponent<{ jsonStorage: Settings }> = ({
	api,
}) => {
	const storage = api.jsonStorage

	const [values, setValues] = useState<Settings>(() => ({
		...DEFAULT_SETTINGS,
		...(storage.cache as Partial<Settings> | undefined),
	}))

	// If the storage had not finished loading when this page opened.
	useEffect(() => {
		storage.get().then(value => setValues({ ...DEFAULT_SETTINGS, ...value }))
	}, [storage])

	const change =
		<K extends keyof Settings>(key: K) =>
		(value: Settings[K]) => {
			const next = { ...values, [key]: value }
			setValues(next)
			storage.set(next, true)
		}

	return (
		<ScrollView keyboardShouldPersistTaps="handled">
			<Page>
				<Design.TableRowGroup title="Live preview">
					<Preview values={values} />
				</Design.TableRowGroup>

				<Design.TableRowGroup title="Profile">
					<Design.TextInput
						label="Name"
						placeholder="Discord"
						value={values.name}
						onChange={change('name')}
					/>
					<Design.TextInput
						label="Avatar image URL"
						placeholder="https://example.com/avatar.png"
						value={values.avatar}
						onChange={change('avatar')}
					/>
					<Design.TextInput
						label="Banner image URL"
						placeholder="https://example.com/banner.png"
						value={values.banner}
						onChange={change('banner')}
					/>
				</Design.TableRowGroup>

				<Design.TableRowGroup title="Role / name color">
					<ColorField
						label="Name color"
						value={values.nameColor}
						fallback={PREVIEW_DEFAULTS.nameColor}
						onChange={change('nameColor')}
					/>
				</Design.TableRowGroup>

				<Design.TableRowGroup title="Bot badge">
					<Design.TextInput
						label="Badge text"
						placeholder={PREVIEW_DEFAULTS.badgeText}
						value={values.badgeText}
						onChange={change('badgeText')}
					/>
					<ColorField
						label="Badge background color"
						value={values.badgeBgColor}
						fallback={PREVIEW_DEFAULTS.badgeBgColor}
						onChange={change('badgeBgColor')}
					/>
					<ColorField
						label="Badge text color"
						value={values.badgeTextColor}
						fallback={PREVIEW_DEFAULTS.badgeTextColor}
						onChange={change('badgeTextColor')}
					/>
					<Design.TableSwitchRow
						label="Verified checkmark"
						value={values.verified}
						onValueChange={change('verified')}
					/>
				</Design.TableRowGroup>

				<Design.TableRowGroup title="Notes">
					<Design.TableRow label="Leave a field empty to keep Discord's default. The verified checkmark is always white." />
				</Design.TableRowGroup>
			</Page>
		</ScrollView>
	)
}
