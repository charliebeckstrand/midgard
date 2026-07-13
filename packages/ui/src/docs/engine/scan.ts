import fs from 'node:fs'
import path from 'node:path'

/**
 * Every `.md` file under `dir`, recursively, absolute-pathed and sorted. A
 * node-only leaf (no Vite), kept separate so the manifest scan stays a plain
 * filesystem walk with no bundler dependencies.
 */
export function scanMarkdown(dir: string): string[] {
	if (!fs.existsSync(dir)) return []

	return fs
		.readdirSync(dir, { withFileTypes: true, recursive: true })
		.filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
		.map((entry) => path.join(entry.parentPath, entry.name))
		.sort()
}
