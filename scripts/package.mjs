import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	writeFileSync,
} from 'node:fs'
import { zipSync } from 'fflate'

mkdirSync('build/dist', { recursive: true })
for (const entry of readdirSync('plugins', { withFileTypes: true })) {
	const directory = `plugins/${entry.name}`
	if (!entry.isDirectory() || !existsSync(`${directory}/manifest.json`))
		continue
	const manifestBytes = readFileSync(`${directory}/manifest.json`)
	const manifest = JSON.parse(manifestBytes.toString())
	const files = { 'manifest.json': manifestBytes }
	if (manifest.dist.script) {
		files[manifest.dist.script] = readFileSync(
			`${directory}/build/js/${manifest.dist.script}`,
		)
	}
	const output = `build/dist/${manifest.id}@${manifest.version}.zip`
	writeFileSync(output, zipSync(files))
	console.log(`Packaged ${output}`)
}
