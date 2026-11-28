const FACES = ['(・`ω´・)', ';;w;;', 'owo', 'UwU', '>w<', '^w^']

// Code, links, mentions, channels and emoji are kept as they are, so the message still works.
const PROTECTED = /(```[\s\S]*?```|`[^`\n]*`|https?:\/\/\S+|<(?:@[!&]?|#|a?:\w+:)\d*>|:\w+:)/

function uwuifyText(text: string, random: () => number): string {
	return text
		.replace(/[rl]/g, 'w')
		.replace(/[RL]/g, 'W')
		.replace(/n([aeiou])/g, 'ny$1')
		.replace(/N([aeiou])/g, 'Ny$1')
		.replace(/N([AEIOU])/g, 'NY$1')
		.replace(/ove/g, 'uv')
		.replace(/!+/g, () => ` ${FACES[Math.floor(random() * FACES.length)]}`)
}

export function uwuify(text: string, random: () => number = Math.random): string {
	// The capture group in PROTECTED puts the kept parts at the odd positions.
	return text
		.split(PROTECTED)
		.map((part, i) => (i % 2 ? part : uwuifyText(part, random)))
		.join('')
}
