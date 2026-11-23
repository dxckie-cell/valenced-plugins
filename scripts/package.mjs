import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	writeFileSync,
} from 'node:fs'
import { zipSync } from 'fflate'

mkdirSync('build/dist', { recursive: true })
for (const root of ['plugins', 'themes']) {
	for (const entry of readdirSync(root, { withFileTypes: true })) {
		const directory = `${root}/${entry.name}`
		if (!entry.isDirectory() || !existsSync(`${directory}/manifest.json`))
			continue
		const manifestBytes = readFileSync(`${directory}/manifest.json`)
		const manifest = JSON.parse(manifestBytes.toString())
		const files = { 'manifest.json': manifestBytes }
		// Prebuilt plugins ship an already-bundled script and jar in prebuilt/.
		const prebuilt = `${directory}/prebuilt`
		if (manifest.dist.script) {
			const built = `${prebuilt}/${manifest.dist.script}`
			files[manifest.dist.script] = readFileSync(
				existsSync(built)
					? built
					: `${directory}/build/js/${manifest.dist.script}`,
			)
		}
		if (manifest.dist.android) {
			const { path } = manifest.dist.android
			files[path] = readFileSync(`${prebuilt}/${path}`)
		}
		const output = `build/dist/${manifest.id}@${manifest.version}.zip`
		writeFileSync(output, zipSync(files))
		console.log(`Packaged ${output}`)
	}
}
