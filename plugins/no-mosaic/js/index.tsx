import Page from '@valenced/components/Page'
import { Design } from '@valenced/discord/design'
import { Clipboard } from '@valenced/externals/react-native-clipboard'
import { before } from '@valenced/patcher'
import { useState } from 'react'
import { ScrollView } from 'react-native'

// Observe-only: the grid is drawn natively from the JSON that updateRows sends, so we capture one
// grouped message row as it is serialized to learn what shape the native list expects.
const status = { sample: '', single: '', calls: 0, tops: [] as string[] }

// Fields after the first 55 keys, plus every field of the wrapper around the message.
const tail = (v: any) => Object.keys(v).slice(55).map(k => `${k}:${brief(v[k], 1)}`).join(', ')
const wrapper = (v: any) => Object.keys(v).filter(k => k !== 'message').map(k => `${k}:${brief(v[k], 1)}`).join(', ')

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
					<Design.TableRow label={`Single: ${status.single || 'none yet'}`} />
					<Design.TableRow label="Copy sample" onPress={() => Clipboard.setString(`${status.sample}\nSINGLE ${status.single}`)} />
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
				if ((status.sample && status.single) || busy) return args
				busy = true
				try {
					status.calls++
					const a = args[0]
					// Find a message with a grouped attachment list (and one with a single attachment, to compare).
					let budget = 400
					const find = (v: any, path: string, parent: any, depth: number): void => {
						if (!v || typeof v !== 'object' || depth > 5 || budget-- < 0) return
						const n = Array.isArray(v.attachments) ? v.attachments.length : 0
						if (n > 0 && 'useAttachmentGridLayout' in v) {
							const text = `at=${path || 'root'} n=${n} grid=${v.useAttachmentGridLayout} opacity=${v.attachmentsOpacity} wrapper={${parent ? wrapper(parent) : ''}} tail={${tail(v)}}`
							if (n > 1 && !status.sample) status.sample = text
							if (n === 1 && !status.single) status.single = text
							return
						}
						for (const k of Object.keys(v).slice(0, 60)) find(v[k], `${path}.${k}`, v, depth + 1)
					}
					find(a, '', null, 0)
				} catch {}
				busy = false
				return args
			}),
		)
	},
})
