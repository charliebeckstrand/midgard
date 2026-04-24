import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

const VIRTUAL_ID = 'virtual:demo-metas'
const RESOLVED_ID = `\0${VIRTUAL_ID}`

type DemoMeta = { name?: string; category?: string }

function collectDemos(dir: string, prefix = ''): string[] {
	if (!fs.existsSync(dir)) return []

	const result: string[] = []

	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const rel = prefix ? `${prefix}/${entry.name}` : entry.name

		const full = path.join(dir, entry.name)

		if (entry.isFile() && entry.name.endsWith('.tsx')) {
			result.push(rel)
		} else if (entry.isDirectory()) {
			result.push(...collectDemos(full, rel))
		}
	}

	return result
}

/**
 * Parse `export const meta = { name?: '...', category?: '...' }` out of a
 * demo source file. Intentionally strict — demo metas are hand-authored and
 * shaped uniformly, so a regex is enough and avoids pulling in a parser.
 */
function parseMeta(source: string): DemoMeta {
	const match = source.match(/export\s+const\s+meta\s*=\s*\{([^}]*)\}/)

	if (!match) return {}

	const body = match[1] ?? ''

	const meta: DemoMeta = {}

	const name = body.match(/name\s*:\s*['"]([^'"]+)['"]/)

	const category = body.match(/category\s*:\s*['"]([^'"]+)['"]/)

	if (name) meta.name = name[1]

	if (category) meta.category = category[1]

	return meta
}

function generate(demosDir: string): Record<string, DemoMeta> {
	const files = collectDemos(demosDir)

	const result: Record<string, DemoMeta> = {}

	for (const rel of files) {
		const full = path.join(demosDir, rel)

		const source = fs.readFileSync(full, 'utf-8')

		result[`./demos/${rel}`] = parseMeta(source)
	}

	return result
}

/**
 * Vite plugin that pre-computes demo metadata at build time.
 *
 * Exposes a `virtual:demo-metas` module so the docs registry can read each
 * demo's `name` / `category` without eagerly importing every demo module —
 * keeping the dynamic `import.meta.glob` loaders as true per-route chunks.
 */
export function demoMetasPlugin(): Plugin {
	let demosDir: string

	let cachedJson: string | null = null

	return {
		name: 'demo-metas',

		configResolved(config) {
			demosDir = path.resolve(config.root, 'demos')
		},

		resolveId(id) {
			if (id === VIRTUAL_ID) return RESOLVED_ID
		},

		load(id) {
			if (id === RESOLVED_ID) {
				cachedJson ??= JSON.stringify(generate(demosDir))

				return `export default ${cachedJson}`
			}
		},

		handleHotUpdate({ file, server }) {
			if (!file.startsWith(demosDir) || !file.endsWith('.tsx')) return

			cachedJson = null

			const mod = server.moduleGraph.getModuleById(RESOLVED_ID)

			if (mod) {
				server.moduleGraph.invalidateModule(mod)

				return [mod]
			}
		},
	}
}
