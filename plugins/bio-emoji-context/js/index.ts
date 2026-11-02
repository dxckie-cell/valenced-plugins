import { getModules } from '@valenced/modules/finders'
import { withName } from '@valenced/modules/finders/filters'
import { instead } from '@valenced/patcher'
import { getErrorStack } from '@valenced/utils/error'
import { Text } from 'react-native'
import {
	Children,
	cloneElement,
	createContext,
	createElement,
	isValidElement,
	useContext,
	useState,
} from 'react'
import { emojiFromProps, rememberNames } from './emoji'
import { findEmojiSheet, openEmojiSheet } from './sheet'
import type { ReactElement, ReactNode } from 'react'
import type { EmojiRef } from './emoji'

const MaxDepth = 14

interface Saved {
	/** Module id of Discord's emoji sheet, learned the first time it opens */
	sheetModuleId?: number | null
}

// Tapping selectable text makes Android focus it and scroll the profile to it, which is
// what Selectable Bios does to bios. So while an emoji is pressed, the bio's selection is
// switched off, and back on once the finger lifts.
const SetPressing = createContext<(pressing: boolean) => void>(() => {})

function EmojiPress({
	emoji,
	children,
}: {
	emoji: EmojiRef
	children?: ReactNode
}) {
	const setPressing = useContext(SetPressing)
	return createElement(
		Text,
		{
			onPressIn: () => setPressing(true),
			onPressOut: () => setPressing(false),
			onPress: () => openEmojiSheet(emoji),
		},
		children,
	)
}

/** The bio's root element, with its `selectable` prop held back while an emoji is pressed. */
function BioRoot({ originalType, ...props }: Record<string, any>) {
	const [pressing, setPressing] = useState(false)
	return createElement(
		SetPressing.Provider,
		{ value: setPressing },
		createElement(originalType, {
			...props,
			selectable: pressing ? false : props.selectable,
		}),
	)
}

function withPressSelection(root: ReactNode): ReactNode {
	if (!isValidElement(root)) return root
	const { type, props, key } = root as ReactElement<Record<string, any>>
	return createElement(BioRoot, {
		...props,
		originalType: type,
		key: key ?? undefined,
	})
}

/** Our press wrappers, never searched again */
const ours = new WeakSet<object>()
/** Original component to wrapper, so identities stay stable between renders */
const wrappers = new WeakMap<object, (props: any) => ReactNode>()

// A bio is plain text, so its emoji have no press handler. Each emoji found in the
// rendered tree is wrapped in a nested <Text onPress>, which lays out inline.
// Discord can render the emoji inside child components, so those are wrapped too
// and their output is searched the same way.
function makeEmojiPressable(node: ReactNode, depth = 0): ReactNode {
	if (depth > MaxDepth) return node

	if (Array.isArray(node)) {
		let changed = false
		const next = node.map(child => {
			const result = makeEmojiPressable(child, depth)
			if (result !== child) changed = true
			return result
		})
		return changed ? next : node
	}

	if (!isValidElement(node)) return node
	const element = node as ReactElement<Record<string, any>>
	if (ours.has(element)) return node

	const emoji = emojiFromProps(element.props)
	if (emoji) {
		const wrapper = createElement(
			EmojiPress,
			{ key: element.key ?? undefined, emoji },
			element,
		)
		ours.add(wrapper)
		return wrapper
	}

	let result = element
	const children = element.props?.children
	if (children !== undefined && typeof children !== 'function') {
		const next = makeEmojiPressable(children, depth + 1)
		if (next !== children)
			result = Array.isArray(next)
				? cloneElement(element, undefined, ...Children.toArray(next))
				: cloneElement(element, undefined, next)
	}

	const type = element.type as unknown
	if (
		typeof type === 'function' &&
		!(type as any).prototype?.isReactComponent
	) {
		let Wrapped = wrappers.get(type)
		if (!Wrapped) {
			const Inner = type as (props: any) => ReactNode
			Wrapped = (props: any) =>
				makeEmojiPressable(Reflect.apply(Inner, undefined, [props]), depth + 1)
			wrappers.set(type, Wrapped)
			// Wrapped components are never wrapped again
			wrappers.set(Wrapped, Wrapped)
		}

		return createElement(Wrapped, { ...result.props, key: result.key ?? undefined })
	}

	return result
}

export default plugin<{ jsonStorage: Saved }>({
	jsonStorage: { load: true, default: {} },
	start({ cleanup, jsonStorage, plugin }) {
		// A profile already on screen keeps the unpatched component until a restart
		if (plugin.startedLate) {
			plugin.requireReload()
			return
		}

		cleanup(
			findEmojiSheet({
				getId: () => {
					const id = (jsonStorage.cache as Saved | undefined)?.sheetModuleId
					return typeof id === 'number' ? id : undefined
				},
				setId: id => jsonStorage.set({ sheetModuleId: id }),
			}),
			// The "About Me" text of a profile
			getModules(
				withName('BioText'),
				module => {
					if (!('default' in module) || typeof module.default !== 'function')
						return

					const bio = module as { default: (...args: any[]) => any }

					cleanup(
						instead(bio, 'default', (args, BioText) => {
							const result = Reflect.apply(BioText, undefined, args)
							try {
								rememberNames(args[0])
								return withPressSelection(makeEmojiPressable(result))
							} catch (e) {
								plugin.reportError(
									`Failed to make bio emoji pressable: ${getErrorStack(e)}`,
								)
								return result
							}
						}),
					)
				},
				{ returnNamespace: true, max: 1 },
			),
		)
	},
})
