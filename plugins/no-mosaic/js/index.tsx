import Page from '@valenced/components/Page'
import { Design } from '@valenced/discord/design'
import { Clipboard } from '@valenced/externals/react-native-clipboard'
import { before } from '@valenced/patcher'
import { useState } from 'react'
import { ScrollView } from 'react-native'

// Observe-only: the grid is drawn natively from the JSON that updateRows sends, so we capture one
// grouped message row as it is serialized to learn what shape the native list expects.
const status = { sample: '', calls: 0 }

const brief = (v: any, depth = 0): string => {
	if (v === null || typeof v !== 'object') return typeof v === 'function' ? 'fn' : String(v).slice(0, 50)
	if (depth >= 2) return Array.isArray(v) ? `[${v.length}]` : '{…}'
	const keys = Object.keys(v).slice(0, 60)
	return `${Array.isArray(v) ? `[${v.length}]` : ''}{${keys.map(k => `${k}:${brief(v[k], depth + 1)}`).join(', ')}}`
}

const SettingsComponent = () => {
	const [, refresh] = useState(0)
	return (
		<ScrollView>
			<Page>
				<Design.TableRowGroup title="Status">
					<Design.TableRow label={`Serialize calls checked: ${status.calls}`} />
					<Design.TableRow label="Copy sample" onPress={() => Clipboard.setString(status.sample)} />
					<Design.TableRow label={status.sample || 'No sample yet: open a chat with several images, then Refresh'} />
					<Design.TableRow label="Refresh" onPress={() => refresh(n => n + 1)} />
				</Design.TableRowGroup>
			</Page>
		</ScrollView>
	)
}

export default plugin({
	SettingsComponent,

	start({ cleanup }) {
		let busy = false
		cleanup(
			before(JSON, 'stringify', (args: any[]) => {
				// Cheap exit once we have the sample; hooks must always hand the arguments back.
				if (status.sample || busy) return args
				busy = true
				try {
					status.calls++
					const a = args[0]
					const rows: any[] | undefined = Array.isArray(a) ? a : a?.rows
					if (Array.isArray(rows)) {
						const row = rows.slice(0, 200).find(r => r && typeof r === 'object' && r.attachments?.length > 1)
						if (row) status.sample = `payload=${Array.isArray(a) ? 'array' : Object.keys(a).slice(0, 10).join(',')} rows=${rows.length} row=${brief(row)}`
					}
				} catch {}
				busy = false
				return args
			}),
		)
	},
})
