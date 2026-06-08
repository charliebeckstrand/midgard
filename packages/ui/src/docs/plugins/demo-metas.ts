import fs from 'node:fs'
import path from 'node:path'
import { Node, Project, SyntaxKind } from 'ts-morph'
import type { Plugin } from 'vite'
import { virtualJsonHooks } from './virtual-json'

type DemoMeta = { name?: string; category?: string }

const META_KEYS: ReadonlySet<string> = new Set(['name', 'category'])

function isMetaKey(key: string): key is keyof DemoMeta {
	return META_KEYS.has(key)
}

/**
 * Parse `export const meta = { name?: '...', category?: '...' }` out of a
 * demo source file. Drops unknown keys and non-string-literal values so the
 * registry only ever sees the typed shape.
 */
function parseMeta(project: Project, fileName: string, source: string): DemoMeta {
	const sf = project.createSourceFile(fileName, source, { overwrite: true })

	const decl = sf.getVariableDeclaration('meta')

	if (!decl?.isExported()) return {}

	const init = decl.getInitializerIfKind(SyntaxKind.ObjectLiteralExpression)

	if (!init) return {}

	const meta: DemoMeta = {}

	for (const prop of init.getProperties()) {
		if (!Node.isPropertyAssignment(prop)) continue

		const key = prop.getName()

		if (!isMetaKey(key)) continue

		const value = prop.getInitializerIfKind(SyntaxKind.StringLiteral)

		if (value) meta[key] = value.getLiteralText()
	}

	return meta
}

export function generateDemoMetas(demosDir: string): Record<string, DemoMeta> {
	if (!fs.existsSync(demosDir)) return {}

	const project = new Project({ useInMemoryFileSystem: true, skipLoadingLibFiles: true })

	const result: Record<string, DemoMeta> = {}

	for (const entry of fs.readdirSync(demosDir, { recursive: true, withFileTypes: true })) {
		if (!entry.isFile() || !entry.name.endsWith('.tsx')) continue

		const full = path.join(entry.parentPath, entry.name)

		const rel = path.relative(demosDir, full).replaceAll(path.sep, '/')

		result[`./demos/${rel}`] = parseMeta(project, full, fs.readFileSync(full, 'utf-8'))
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
			generate: () => generateDemoMetas(demosDir),
			shouldInvalidate: (file) => file.startsWith(demosDir) && file.endsWith('.tsx'),
		}),
	}
}
