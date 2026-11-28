import { ToastActionCreators } from '@valenced/discord/actions'
import { getModules } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import { instead } from '@valenced/patcher'
import { uwuify } from './uwuify'

interface MessageActions {
	sendMessage(channelId: string, message: { content?: string }, ...rest: unknown[]): unknown
	receiveMessage: unknown
}

export default plugin<{ jsonStorage: { enabled: boolean } }>({
	jsonStorage: { load: true, default: { enabled: true } },
	start({ cleanup, jsonStorage, commands }: any) {
		const isOn = () => jsonStorage.cache?.enabled ?? true

		cleanup(
			commands.commands.registerCommand({
				name: 'uwuify',
				description: 'Turn UwUify on or off. Leave it empty to switch.',
				options: [
					{
						name: 'enabled',
						description: 'On or off. Leave empty to switch.',
						type: 5, // BOOLEAN
						required: false,
					},
				],
				execute: (args: { value?: boolean }[]) => {
					const enabled = args[0]?.value ?? !isOn()
					jsonStorage.set({ enabled })
					ToastActionCreators.open('uwuify-toggle', { text: `UwUify is ${enabled ? 'on' : 'off'}` })
				},
			}),
			getModules(withProps<MessageActions>('sendMessage', 'receiveMessage'), messages => {
				cleanup(
					instead(messages, 'sendMessage', function (args, original) {
						const message = args[1]
						if (isOn() && typeof message?.content === 'string')
							args[1] = { ...message, content: uwuify(message.content) }
						return Reflect.apply(original, this, args)
					}),
				)
			}),
		)
	},
})
