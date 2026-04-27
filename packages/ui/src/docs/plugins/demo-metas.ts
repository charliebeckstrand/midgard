import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'
import { virtualJsonHooks } from './virtual-json'

type DemoMeta = { name?: string; category?: string }

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
	if (!fs.existsSync(demosDir)) return {}

	const result: Record<string, DemoMeta> = {}

	for (const entry of fs.readdirSync(demosDir, { recursive: true, withFileTypes: true })) {
		if (!entry.isFile() || !entry.name.endsWith('.tsx')) continue

		const full = path.join(entry.parentPath, entry.name)

		const rel = path.relative(demosDir, full).replaceAll(path.sep, '/')

		result[`./demos/${rel}`] = parseMeta(fs.readFileSync(full, 'utf-8'))
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
	let demosDir = ''

	return {
		name: 'demo-metas',

		configResolved(config) {
			demosDir = path.resolve(config.root, 'demos')
		},

		...virtualJsonHooks({
			id: 'virtual:demo-metas',
			generate: () => generate(demosDir),
			shouldInvalidate: (file) => file.startsWith(demosDir) && file.endsWith('.tsx'),
		}),
	}
}
