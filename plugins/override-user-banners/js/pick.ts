import { ToastActionCreators } from '@valenced/discord/actions'
import { Alert, NativeModules } from 'react-native'

function toast(text: string) {
	try {
		const creators = ToastActionCreators as any
		if (typeof creators.openMana === 'function') creators.openMana('OverrideUserBannersToast', { text })
		else creators.open({ key: 'OverrideUserBannersToast', content: text }, { text })
	} catch {
		/* a missing toast must never stop the upload */
	}
}

/** Lets the user pick a photo with Discord's own image picker, uploads it to catbox.moe and returns the link. */
export async function pickImage(): Promise<string | undefined> {
	// The native module behind Discord's own photo picker; Discord's JS wrapper isn't loaded until it is used.
	const manager: any = NativeModules.ImagePickerManager
	if (!manager?.launchImageLibrary) return void Alert.alert('No image picker', "Could not find the phone's photo picker. Use an image link instead.")

	try {
		const result: any = await new Promise(done =>
			manager.launchImageLibrary({
					// The same options Discord itself passes; the native side crashes if some are missing.
					mediaType: 'photo',
					videoQuality: 'high',
					quality: 1,
					maxWidth: 0,
					maxHeight: 0,
					includeBase64: false,
					cameraType: 'back',
					selectionLimit: 1,
					saveToPhotos: false,
					durationLimit: 0,
					includeExtra: false,
					presentationStyle: 'pageSheet',
					selection: [],
					useNewIOSPicker: true,
					forceGetContent: false,
					enableAndroidPhotoPicker: false,
				}, done),
		)
		if (result?.errorCode || result?.errorMessage) throw new Error(result.errorMessage ?? result.errorCode)
		const asset = result?.assets?.[0] ?? result
		const uri: string | undefined = asset?.uri ?? asset?.path
		if (!uri || result?.didCancel || result?.cancelled) return

		toast('Uploading...')
		const name = asset.fileName ?? asset.name ?? 'image.jpg'
		// catbox sometimes answers with an empty reply (HTTP 200, no link), so try a few times before giving up.
		let text = ''
		for (let attempt = 0; attempt < 3 && !/^https?:\/\//.test(text); attempt++) {
			if (attempt) await new Promise(done => setTimeout(done, 1500))
			const form = new FormData()
			form.append('reqtype', 'fileupload')
			form.append('fileToUpload', { uri, name, type: asset.type ?? asset.mimeType ?? 'image/jpeg' } as any)
			const response = await fetch('https://catbox.moe/user/api.php', { method: 'POST', body: form })
			text = (await response.text()).trim()
		}
		if (!/^https?:\/\//.test(text)) throw new Error(text || 'catbox.moe sent an empty reply three times. Try again in a minute.')
		return text
	} catch (e: any) {
		Alert.alert('Upload failed', String(e?.message ?? e))
	}
}
