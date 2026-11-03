import { AlertActionCreators } from '@valenced/discord/actions'
import { Design } from '@valenced/discord/design'
import { getModules } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import { before, instead } from '@valenced/patcher'

const { AlertActionButton, AlertModal } = Design

// Discord's "file exceeds the maximum upload size" error code
const FILE_TOO_LARGE = 40005

// Extensions to restore on files that lost theirs, by mime type
const EXTENSIONS: Record<string, string[]> = {
	'image/png': ['.png'],
	'image/jpg': ['.jpg', '.jpeg'],
	'image/jpeg': ['.jpg', '.jpeg'],
}

export default plugin({
	start({ cleanup }) {
		cleanup(
			getModules(withProps<any>('CloudUpload'), ({ CloudUpload }) => {
				const proto = CloudUpload?.prototype
				if (typeof proto?.reactNativeCompressAndExtractData !== 'function')
					return

				// Run Discord's own prep, then point every size back at the original
				cleanup(
					instead(
						proto,
						'reactNativeCompressAndExtractData',
						function (args, original) {
							Promise.resolve(Reflect.apply(original, this, args)).catch(
								() => {},
							)

							this.reactNativeFilePrepped = true
							const size = this.preCompressionSize || 1000
							this.preCompressionSize = size
							this.postCompressionSize = size
							this.currentSize = size

							const name = this.filename
							const exts = EXTENSIONS[this.mimeType]
							if (
								typeof name === 'string' &&
								exts &&
								!exts.some(ext => name.toLowerCase().endsWith(ext))
							)
								this.filename = name + exts[0]

							return Promise.resolve(this)
						},
					),
				)

				if (typeof proto.handleError !== 'function') return

				cleanup(
					before(proto, 'handleError', args => {
						if (args[0] === FILE_TOO_LARGE)
							AlertActionCreators.openAlert(
								'dxckie.no-compression.file-too-large',
								<AlertModal
									title="File is too big to upload"
									content="The file you are trying to upload exceeds the maximum allowed size."
									actions={<AlertActionButton variant="primary" text="Accept" />}
								/>,
							)
						return args
					}),
				)
			}),
		)
	},
})
