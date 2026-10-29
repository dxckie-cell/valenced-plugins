/*
 * Inspired by Equicord's BetterInvites plugin
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { getAssetIdByName } from '@valenced/assets'
import {
	ActionSheetActionCreators,
	AlertActionCreators,
	ToastActionCreators,
} from '@valenced/discord/actions'
import { Design } from '@valenced/discord/design'
import { ImportTrackerModuleId } from '@valenced/discord/common/import-tracker'
import { LoggerModuleId } from '@valenced/discord/common/logger'
import { withStoreName } from '@valenced/discord/flux'
import { lookupModule } from '@valenced/modules/finders'
import {
	withDependencies,
	withName,
	withProps,
} from '@valenced/modules/finders/filters'
import { after, before } from '@valenced/patcher'
import { useEffect } from 'react'

const INVITE_LINK =
	/(?:discord\.gg|discord(?:app)?\.com\/invite)\/([a-zA-Z0-9-]{2,})/gi
const MENU = 'MessageLongPressActionSheet'
const ALERT = 'better-invites'

const toast = (text: string) =>
	ToastActionCreators.open(`${ALERT}:${Date.now()}`, { text })

type Action = [label: string, run: () => void]

function showAlert(content: string, actions: Action[] = []) {
	const { AlertModal, AlertActionButton, Text } = Design

	AlertActionCreators.openAlert(
		ALERT,
		<AlertModal
			title="Invite info"
			content={
				<Text variant="text-md/medium" color="text-default">
					{content}
				</Text>
			}
			actions={
				<>
					{actions.map(([label, run]) => (
						<AlertActionButton
							key={label}
							variant="primary"
							text={label}
							onPress={() => {
								AlertActionCreators.dismissAlert(ALERT)
								run()
							}}
						/>
					))}
					<AlertActionButton variant="secondary" text="Close" />
				</>
			}
		/>,
	)
}

const find = (...filters: any[]) => {
	for (const filter of filters) {
		try {
			const [exports] = lookupModule(filter) as any[]
			if (exports) return exports
		} catch {}
	}
}

function openProfile(userId: string) {
	try {
		// Same lookup Valenced uses for its own profile links.
		const { ordered, relative } = withDependencies
		const [, userStoreId] = lookupModule(withStoreName('UserStore')) as any[]

		const show = find(
			withName('showUserProfileActionSheet').and(
				withDependencies(
					ordered([
						LoggerModuleId,
						userStoreId,
						relative(1),
						relative(2),
						relative(3),
						ImportTrackerModuleId,
					]),
				),
			),
			withName('showUserProfileActionSheet'),
		)
		const fn =
			typeof show === 'function'
				? show
				: (show?.default ?? show?.showUserProfileActionSheet)

		fn({ userId }, 'stack')
	} catch (e) {
		toast(`Couldn't open that profile: ${String(e).slice(0, 60)}`)
	}
}

// Joins as a lurker (preview only, not a member), then opens the server.
function preview(guildId: string) {
	const fail = (e: unknown) =>
		toast(`Couldn't preview: ${String(e).slice(0, 80)}`)
	try {
		const guilds = find(withProps('joinGuild'))
		const navigation = find(withProps('transitionToGuildSync'))

		Promise.resolve(guilds.joinGuild(guildId, { lurker: true }))
			.then(() => navigation.transitionToGuildSync(guildId))
			.catch(fail)
	} catch (e) {
		fail(e)
	}
}

const timeout = <T,>(promise: Promise<T>, ms: number) =>
	Promise.race([
		promise,
		new Promise<never>((_, reject) =>
			setTimeout(() => reject(new Error('timed out')), ms),
		),
	])

// Discord client first, public invite API as a fallback.
function lookup(code: string): Promise<any> {
	const viaClient = () => {
		const invites = find(withProps('resolveInvite'))
		return timeout(
			Promise.resolve(invites.resolveInvite(code, 'Invite Info')).then(
				(res: any) => {
					const invite = res?.invite ?? res
					if (!invite?.guild) throw new Error('no server in response')
					return invite
				},
			),
			4000,
		)
	}

	const viaWeb = () =>
		timeout(
			fetch(
				`https://discord.com/api/v9/invites/${code}?with_counts=true&with_expiration=true`,
			).then(res => {
				if (!res.ok) throw new Error(`status ${res.status}`)
				return res.json()
			}),
			6000,
		)

	return Promise.resolve().then(viaClient).catch(viaWeb)
}

function describeExpiry(expiresAt?: string | null) {
	if (!expiresAt) return 'never'

	const date = new Date(expiresAt)
	const diff = date.getTime() - Date.now()
	const abs = Math.abs(diff)
	const units: [string, number][] = [
		['day', 86_400_000],
		['hour', 3_600_000],
		['minute', 60_000],
	]
	const [unit, size] = units.find(([, ms]) => abs >= ms) ?? ['minute', 60_000]
	const amount = Math.max(1, Math.round(abs / size))
	const span = `${amount} ${unit}${amount === 1 ? '' : 's'}`

	return `${diff >= 0 ? `in ${span}` : `${span} ago`} (${date.toLocaleString()})`
}

function showInfo(code: string) {
	toast('Loading invite info...')
	lookup(code)
		.then(
			({
				guild,
				inviter,
				expires_at,
				approximate_member_count,
				approximate_presence_count,
			}) => {
				const lines = [
					`Server: ${guild?.name ?? 'unknown'}`,
					`Invited by: ${inviter ? inviter.global_name || inviter.username : 'unknown'}`,
					`Expires: ${describeExpiry(expires_at)}`,
				]
				if (approximate_member_count != null)
					lines.push(
						`Members: ${approximate_member_count} (${approximate_presence_count ?? 0} online)`,
					)

				const actions: Action[] = []
				if (guild?.features?.includes('DISCOVERABLE'))
					actions.push(['Preview server', () => preview(guild.id)])
				if (inviter)
					actions.push(['Inviter profile', () => openProfile(inviter.id)])

				showAlert(lines.join('\n'), actions)
			},
		)
		.catch((e: unknown) =>
			showAlert(`Couldn't load this invite.\n\n${String(e)}`),
		)
}

const isRow = (c: any) =>
	typeof c?.props?.onPress === 'function' &&
	(typeof c.props.label === 'string' || typeof c.props.message === 'string')

// Finds the array of action sheet rows in a rendered tree.
function findRows(node: any, depth = 0): any[] | undefined {
	if (!node || typeof node !== 'object' || depth > 40) return

	if (Array.isArray(node)) {
		if (node.some(isRow)) return node
		for (const child of node) {
			const found = findRows(child, depth + 1)
			if (found) return found
		}
		return
	}

	return findRows(node.props?.children, depth + 1)
}

function addButtons(tree: any, codes: string[]) {
	const rows = findRows(tree)
	if (!rows) return false
	if (rows.some(r => String(r?.key).startsWith('better-invites-'))) return true

	const { ActionSheetRow, TableRow } = Design

	rows.splice(
		Math.min(1, rows.length),
		0,
		...codes.map(code => (
			<ActionSheetRow
				key={`better-invites-${code}`}
				label={codes.length > 1 ? `Invite info (${code})` : 'Invite info'}
				icon={<TableRow.Icon source={getAssetIdByName('LinkIcon')} />}
				onPress={() => {
					ActionSheetActionCreators.hideActionSheet(MENU)
					showInfo(code)
				}}
			/>
		)),
	)
	return true
}

export default plugin({
	start({ cleanup }) {
		cleanup(
			before(ActionSheetActionCreators, 'openLazy', (args: any) => {
				const [component, key, props] = args
				const content = props?.message?.content

				if (key !== MENU || typeof content !== 'string') return args

				const codes = [
					...new Set([...content.matchAll(INVITE_LINK)].map(m => m[1]!)),
				].slice(0, 3)
				if (!codes.length || typeof component?.then !== 'function')
					return args

				component.then((instance: any) => {
					let warned = false
					const unpatch = after(instance, 'default', (tree: any) => {
						// Drops the patch when this sheet closes.
						useEffect(() => () => unpatch(), [])
						try {
							if (!addButtons(tree, codes) && !warned) {
								warned = true
								toast("BetterInvites couldn't find the message menu.")
							}
						} catch {}
						return tree
					})
				})

				return args
			}),
		)
	},
})
