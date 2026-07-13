import fs from 'node:fs'
import path from 'node:path'

/**
 * Every `.md` file under `dir`, recursively, absolute-pathed and sorted. A
 * node-only leaf (no Vite) so the content plugin and a consumer's fence-check
 * script share one walk without either pulling the other's dependencies.
 */
export function scanMarkdown(dir: string): string[] {
	if (!fs.existsSync(dir)) return []

	return fs
		.readdirSync(dir, { withFileTypes: true, recursive: true })
		.filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
		.map((entry) => path.join(entry.parentPath, entry.name))
		.sort()
}
