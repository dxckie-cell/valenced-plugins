import { lookupModule } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import { Alert } from 'react-native'

// shortcut: no resizing, the image is stored as-is in the plugin's JSON storage; resize if big images are needed
const MAX_LENGTH = 2_000_000

/** Lets the user pick an image from their device and returns it as a data URL (the image itself, not a link). */
export async function pickImage(): Promise<string | undefined> {
	const legacy: any = lookupModule(withProps<any>('pickSingle', 'isCancel'))?.[0]
	const modern: any = lookupModule(withProps<any>('pick', 'saveDocuments'))?.[0]

	try {
		let uri: string | undefined
		if (legacy) {
			const file = await legacy.pickSingle({ type: [legacy.types.images], mode: 'import', copyTo: 'cachesDirectory' })
			uri = file.fileCopyUri ?? file.uri
		} else if (modern) {
			uri = (await modern.pick({ type: [modern.types.images], mode: 'import' }))[0]?.uri
		}
		if (!uri) return

		const blob = await (await fetch(uri)).blob()
		const url = await new Promise<string>((ok, fail) => {
			const reader = new FileReader()
			reader.onload = () => ok(reader.result as string)
			reader.onerror = () => fail(reader.error)
			reader.readAsDataURL(blob)
		})

		if (url.length > MAX_LENGTH) return void Alert.alert('Image too large', 'Pick an image under about 1.5 MB.')
		return url
	} catch (e: any) {
		const cancelled = e?.code === 'DOCUMENT_PICKER_CANCELED' || e?.code === 'OPERATION_CANCELED' || legacy?.isCancel?.(e)
		if (!cancelled) Alert.alert('Could not load the image', String(e?.message ?? e))
	}
}
