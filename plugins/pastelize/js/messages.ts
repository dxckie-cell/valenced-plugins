import { Stores } from '@valenced/discord/flux'
import { getSettings } from './state'
import { pastelHex, pastelNative } from './color'

const members = () => (Stores as any).GuildMemberStore

// Colors @mentions of users that have no role color. Returns false to stop the walk.
function colorMentions(nodes: any[], guildId: string | undefined): boolean {
	for (const node of nodes) {
		if (node.type === 'mention' && node.userId != null && node.colorString == null) {
			if (guildId != null && members()?.getMember(guildId, node.userId) == null) return false
			const hex = pastelHex(node.userId, 0.85, 0.75)
			const value = Number.parseInt(hex.slice(1), 16)
			node.roleColor = value
			node.color = value
			node.colorString = hex
		} else if (Array.isArray(node.content) && !colorMentions(node.content, guildId)) {
			return false
		}
	}
	return true
}

/** Gives one message row a pastel name color. `source` is the message the row was made from. */
function pastelize(row: any, source: any) {
	const guildId = row.guildId
	if (row.content) colorMentions(row.content, guildId)

	// Not a member (left the server): leave it alone, unless it is a webhook.
	if (guildId && members()?.getMember(guildId, row.authorId) == null && source?.webhookId == null) return

	const { pastelizeAll, webhookName } = getSettings()
	let seed: string | undefined
	if (source?.webhookId != null) seed = webhookName ? row.username : source.webhookId
	else if (pastelizeAll || !(source?.colorString ?? row.roleColor)) seed = row.authorId
	if (!seed) return

	const color = pastelNative(seed)
	row.roleColor = color
	row.usernameColor = color
	row.colorString = color
}

/** Runs on each generated chat row. */
export function pastelizeRow(rowData: any, result: any) {
	const row = result?.message
	if (!row || rowData?.rowType !== 1) return
	row.shouldShowRoleOnName = true
	pastelize(row, rowData.message)
	if (row.referencedMessage?.message) pastelize(row.referencedMessage.message, null)
}
