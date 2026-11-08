import { lookupModule } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import { Alert } from 'react-native'

/** Lets the user pick a photo with Discord's own image picker, uploads it to catbox.moe and returns the link. */
export async function pickImage(): Promise<string | undefined> {
	// Discord may not have loaded the picker yet, so ask for it to be loaded if it isn't.
	const filter = withProps<any>('launchImageLibraryAsync')
	let found: any
	try {
		found = lookupModule(filter)?.[0] ?? lookupModule(filter, { initialize: true } as any)?.[0]
	} catch {}
	const picker = found?.launchImageLibraryAsync ? found : found?.default
	if (!picker?.launchImageLibraryAsync) return void Alert.alert('No image picker', 'Could not find Discord\'s image picker. Use an image link instead.')

	try {
		const result = await picker.launchImageLibraryAsync({ mediaType: 'photo' })
		const asset = result?.assets?.[0] ?? result
		const uri: string | undefined = asset?.uri ?? asset?.path
		if (!uri || result?.didCancel || result?.cancelled) return

		const name = asset.fileName ?? asset.name ?? 'image.jpg'
		const form = new FormData()
		form.append('reqtype', 'fileupload')
		form.append('fileToUpload', { uri: uri, name, type: asset.type ?? asset.mimeType ?? 'image/jpeg' } as any)

		const response = await fetch('https://catbox.moe/user/api.php', { method: 'POST', body: form })
		const text = (await response.text()).trim()
		if (!response.ok || !/^https?:\/\//.test(text)) throw new Error(text || `HTTP ${response.status}`)
		return text
	} catch (e: any) {
		Alert.alert('Upload failed', String(e?.message ?? e))
	}
}
