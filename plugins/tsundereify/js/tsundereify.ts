const TAILS = [
	' ...b-baka.',
	' Hmph.',
	" It's not like I care or anything!",
	" D-don't get the wrong idea!",
	" I-I'm only saying this because I have to!",
]
const BURSTS = [' B-baka!', ' Hmph!', " It's not like I wanted to!"]

// Code, links, mentions, channels and emoji are kept as they are, so the message still works.
const PROTECTED = /(```[\s\S]*?```|`[^`\n]*`|https?:\/\/\S+|<(?:@[!&]?|#|a?:\w+:)\d*>|:\w+:)/

const pick = <T>(list: T[], random: () => number): T => list[Math.floor(random() * list.length)]

function tsundereText(text: string, random: () => number): string {
	return text
		.replace(/\bthank(?:s| you)\b/gi, "t-thanks, I guess... not that I'm grateful")
		.replace(/\bplease\b/gi, 'p-please')
		.replace(/\bsorry\b/gi, "s-sorry (it's not like it was my fault!)")
		.replace(/(^|[.?]\s+)([A-Za-z])([A-Za-z]{2,})/g, (m, pre, a, rest) =>
			random() < 0.5 ? `${pre}${a}-${a.toLowerCase()}${rest}` : m,
		)
		.replace(/!+/g, () => pick(BURSTS, random))
}

export function tsundereify(text: string, random: () => number = Math.random): string {
	if (!text.trim()) return text
	// The capture group in PROTECTED puts the kept parts at the odd positions.
	const body = text
		.split(PROTECTED)
		.map((part, i) => (i % 2 ? part : tsundereText(part, random)))
		.join('')
	return /[.!?]$/.test(body) ? body + pick(TAILS, random) : `${body}.${pick(TAILS, random)}`
}
