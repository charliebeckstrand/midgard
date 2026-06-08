import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import type { Plugin } from 'vite'
import { virtualJsonHooks } from './virtual-json'

type ReExport = { source: string; localName: string; exportedName: string; isType: boolean }

/**
 * Parse `export { A, type B, C } from '...'` statements out of an index file.
 * Other top-level forms (default exports, plain `export const`) aren't used
 * by component/layout indexes and are ignored.
 */
function parseReExports(source: string, fileName: string): ReExport[] {
	const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)

	const result: ReExport[] = []

	for (const stmt of sf.statements) {
		if (!ts.isExportDeclaration(stmt)) continue

		if (!stmt.moduleSpecifier || !ts.isStringLiteral(stmt.moduleSpecifier)) continue

		if (!stmt.exportClause || !ts.isNamedExports(stmt.exportClause)) continue

		const moduleSpecifier = stmt.moduleSpecifier.text

		const wholeIsType = stmt.isTypeOnly

		for (const spec of stmt.exportClause.elements) {
			result.push({
				source: moduleSpecifier,
				localName: spec.propertyName?.text ?? spec.name.text,
				exportedName: spec.name.text,
				isType: wholeIsType || spec.isTypeOnly,
			})
		}
	}

	return result
}

function isPascalCase(name: string): boolean {
	return /^[A-Z]/.test(name)
}

export function moduleNameFor(filePath: string, srcDir: string): string | null {
	const rel = path.relative(srcDir, filePath).split(path.sep)

	if (rel[0] === 'components' && rel[2] === 'index.ts') return rel[1] ?? null

	// Providers (e.g. `<GlassProvider>`) are wrappers a demo composes around the
	// component being shown. Tagging them lets the walker render the wrapper —
	// and its import — instead of transparently unwrapping it. Their public
	// specifier nests (`ui/providers/glass`), so carry the full `providers/<name>`.
	if (rel[0] === 'providers' && rel[2] === 'index.ts') return rel[1] ? `providers/${rel[1]}` : null

	if (rel[0] === 'layouts' && rel[1] === 'index.ts') return 'layouts'

	return null
}

/**
 * Record every PascalCase value re-export of a single index file under
 * `moduleName`. Missing files are skipped so callers needn't pre-check.
 */
function collectIndexNames(
	result: Record<string, string>,
	indexPath: string,
	moduleName: string,
): void {
	if (!fs.existsSync(indexPath)) return

	for (const re of parseReExports(fs.readFileSync(indexPath, 'utf-8'), indexPath)) {
		if (re.isType || !isPascalCase(re.exportedName)) continue

		result[re.exportedName] = moduleName
	}
}

/**
 * Scan a directory of `<name>/index.ts` modules (components, providers),
 * deriving each module's name from its directory via `moduleFor`.
 */
function collectDirNames(
	result: Record<string, string>,
	dir: string,
	moduleFor: (name: string) => string,
): void {
	if (!fs.existsSync(dir)) return

	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue

		collectIndexNames(result, path.join(dir, entry.name, 'index.ts'), moduleFor(entry.name))
	}
}

/**
 * Walk every public `components/*\/index.ts`, `providers/*\/index.ts`, and
 * `layouts/index.ts` at build time and collect `{ name → module }` for every
 * PascalCase value re-export.
 */
function buildNameMap(srcDir: string): Record<string, string> {
	const result: Record<string, string> = {}

	collectDirNames(result, path.join(srcDir, 'components'), (name) => name)

	collectDirNames(result, path.join(srcDir, 'providers'), (name) => `providers/${name}`)

	collectIndexNames(result, path.join(srcDir, 'layouts', 'index.ts'), 'layouts')

	return result
}

/**
 * Build the suffix that attaches `__module` / `__name` to every PascalCase
 * value export in an index file. Imports each name locally so it's bound
 * inside the module, then tags the resolved value if it's an object/function.
 */
function buildTagSuffix(reExports: ReExport[], moduleName: string): string {
	const value = reExports.filter((re) => !re.isType && isPascalCase(re.exportedName))

	if (value.length === 0) return ''

	const imports = value
		.map((re, i) => `import { ${re.localName} as __ct_${i} } from ${JSON.stringify(re.source)}`)
		.join('\n')

	const tag =
		`const __ct_tag = (v, n) => {` +
		` if (v != null && (typeof v === 'function' || typeof v === 'object') && !('__module' in v))` +
		` try { Object.assign(v, { __module: ${JSON.stringify(moduleName)}, __name: n }) } catch {}` +
		` }`

	const calls = value
		.map((re, i) => `__ct_tag(__ct_${i}, ${JSON.stringify(re.exportedName)})`)
		.join('\n')

	return `\n${imports}\n${tag}\n${calls}\n`
}

/**
 * Locate the `src/` directory containing `components/` and `layouts/`.
 * Docs build runs with `root = src/docs` (so `..` is `src`); vitest runs
 * with `root = packages/ui` (so `src` is one level down). Try both.
 */
function findSrcDir(root: string): string {
	const candidates = [path.resolve(root, '..'), path.join(root, 'src')]

	const dir = candidates.find((c) => fs.existsSync(path.join(c, 'components')))

	if (!dir) throw new Error(`component-tags: could not locate src dir from ${root}`)

	return dir
}

/**
 * Vite plugin that lets the docs code-derivation walker identify components
 * without eagerly importing every `components/*\/index.ts` at module load.
 *
 * Two halves:
 *  1. A transform on each public component/layout index that tags the module's
 *     PascalCase value exports with `__module` and `__name` properties.
 *  2. A `virtual:component-modules` virtual module exposing `{ [name]: module }`
 *     for the snippet-import pass (which sees a tag's text name, not its
 *     React reference).
 *
 * Components load alongside the demos that import them, not all upfront.
 */
export function componentTagsPlugin(): Plugin {
	let srcDir = ''

	return {
		name: 'component-tags',

		configResolved(config) {
			srcDir = findSrcDir(config.root)
		},

		...virtualJsonHooks({
			id: 'virtual:component-modules',
			generate: () => buildNameMap(srcDir),
			shouldInvalidate: (file) => file.startsWith(srcDir),
		}),

		transform(code, id) {
			const cleanId = id.split('?')[0] ?? ''

			const moduleName = moduleNameFor(cleanId, srcDir)

			if (!moduleName) return

			const suffix = buildTagSuffix(parseReExports(code, cleanId), moduleName)

			if (!suffix) return

			return { code: code + suffix, map: null }
		},
	}
}
