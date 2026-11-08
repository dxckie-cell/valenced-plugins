import { Alert, NativeModules } from 'react-native'

/** Lets the user pick a photo with Discord's own image picker, uploads it to catbox.moe and returns the link. */
export async function pickImage(): Promise<string | undefined> {
	// The native module behind Discord's own photo picker; Discord's JS wrapper isn't loaded until it is used.
	const manager: any = NativeModules.ImagePickerManager
	if (!manager?.launchImageLibrary) return void Alert.alert('No image picker', "Could not find the phone's photo picker. Use an image link instead.")

	try {
		const result: any = await new Promise(done =>
			manager.launchImageLibrary({ mediaType: 'photo', selectionLimit: 1, quality: 1, includeBase64: false }, done),
		)
		if (result?.errorCode || result?.errorMessage) throw new Error(result.errorMessage ?? result.errorCode)
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
