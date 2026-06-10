import fs from 'node:fs'
import path from 'node:path'
import { Node, Project, SyntaxKind } from 'ts-morph'
import ts from 'typescript'
import type { Plugin } from 'vite'
import { buildApi } from '../api-reference'
import { collectHelpers } from './collect-helpers'
import { virtualJsonModules } from './virtual-json'

// ---------------------------------------------------------------------------
// Demo metadata parsed for `virtual:demo-metas`
// ---------------------------------------------------------------------------

type DemoMeta = { name?: string; category?: string }

const META_KEYS: ReadonlySet<string> = new Set(['name', 'category'])

function isMetaKey(key: string): key is keyof DemoMeta {
	return META_KEYS.has(key)
}

/**
 * Parse `export const meta = { name?: '...', category?: '...' }` out of a
 * demo source file. Drops unknown keys and non-string-literal values.
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

function generateDemoMetas(demosDir: string): Record<string, DemoMeta> {
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

// ---------------------------------------------------------------------------
// Component tagging: `virtual:component-modules` + the index-barrel transform
// ---------------------------------------------------------------------------

export type ReExport = { source: string; localName: string; exportedName: string; isType: boolean }

/**
 * Parse `export { A, type B, C } from '...'` statements out of an index file.
 * Ignores other top-level forms (default exports, plain `export const`).
 */
export function parseReExports(source: string, fileName: string): ReExport[] {
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

/**
 * Map a public index file to its module name, or null if the file isn't a
 * taggable barrel. The `docs/` prefix never matches; docs-internal controls
 * stay out of derived code blocks.
 */
export function moduleNameFor(filePath: string, srcDir: string): string | null {
	const rel = path.relative(srcDir, filePath).split(path.sep)

	if (rel[0] === 'components' && rel[2] === 'index.ts') return rel[1] ?? null

	// Providers (e.g. `<GlassProvider>`) are wrappers a demo composes around the
	// component being shown. The walker renders tagged providers and their
	// imports instead of unwrapping them. The module name carries the full
	// `providers/<name>`, matching the nested public specifier
	// (`ui/providers/glass`).
	if (rel[0] === 'providers' && rel[2] === 'index.ts') return rel[1] ? `providers/${rel[1]}` : null

	if (rel[0] === 'layouts' && rel[1] === 'index.ts') return 'layouts'

	return null
}

/**
 * Record every PascalCase value re-export of a single index file under
 * `moduleName`. Skips missing files.
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

/** Re-emit a non-tagged specifier, preserving any `type` modifier and alias. */
function keepSpecifier(re: ReExport): string {
	const named =
		re.localName === re.exportedName ? re.exportedName : `${re.localName} as ${re.exportedName}`

	return re.isType ? `type ${named}` : named
}

/**
 * Rewrite a public index barrel so every PascalCase value export carries the
 * `__module` / `__name` decoration the runtime walker reads. Returns `null` when
 * nothing is taggable, leaving the module untouched.
 *
 * The library declares `sideEffects: false`; production DCE drops standalone
 * side-effect statements in a barrel. Each tagged name is re-bound as
 * `export const Name = __ct_tag(<src>, 'Name')`, placing the `Object.assign`
 * inside the initializer of a consumed export, where it survives as reachable
 * code. Type and non-PascalCase specifiers (hooks, context helpers) pass
 * through unchanged. Barrels are pure named re-exports, the only shape
 * `moduleNameFor` matches; regenerating from `reExports` preserves every
 * specifier.
 */
export function buildTaggedBarrel(reExports: ReExport[], moduleName: string): string | null {
	const tagged = reExports.filter((re) => !re.isType && isPascalCase(re.exportedName))

	if (tagged.length === 0) return null

	const lines: string[] = []

	// Pass-through specifiers (types, non-PascalCase values), grouped by source.
	const keepBySource = new Map<string, string[]>()

	for (const re of reExports) {
		if (!re.isType && isPascalCase(re.exportedName)) continue

		const specs = keepBySource.get(re.source) ?? []

		specs.push(keepSpecifier(re))

		keepBySource.set(re.source, specs)
	}

	for (const [source, specs] of keepBySource) {
		lines.push(`export { ${specs.join(', ')} } from ${JSON.stringify(source)}`)
	}

	// Tagged exports: import the source binding, decorate it, re-export the
	// decorated reference. `__ct_tag` returns its argument; the decoration runs
	// inside the exported value's initializer.
	lines.push(
		`const __ct_tag = (v, n) => {` +
			` if (v != null && (typeof v === 'function' || typeof v === 'object') && !('__module' in v))` +
			` try { Object.assign(v, { __module: ${JSON.stringify(moduleName)}, __name: n }) } catch {}` +
			` return v }`,
	)

	tagged.forEach((re, i) => {
		lines.push(`import { ${re.localName} as __ct_${i} } from ${JSON.stringify(re.source)}`)

		lines.push(
			`export const ${re.exportedName} = __ct_tag(__ct_${i}, ${JSON.stringify(re.exportedName)})`,
		)
	})

	return `${lines.join('\n')}\n`
}

/**
 * Locate the `src/` directory containing `components/` and `layouts/`.
 * Docs build runs with `root = src/docs` (so `..` is `src`); vitest runs
 * with `root = packages/ui` (so `src` is one level down). Try both.
 */
function findSrcDir(root: string): string {
	const candidates = [path.resolve(root, '..'), path.join(root, 'src')]

	const dir = candidates.find((c) => fs.existsSync(path.join(c, 'components')))

	if (!dir) throw new Error(`docs plugin: could not locate src dir from ${root}`)

	return dir
}

// ---------------------------------------------------------------------------
// The plugin
// ---------------------------------------------------------------------------

/**
 * The single Vite plugin backing the docs site. It provides:
 *
 *  - `virtual:api-reference`: prop data parsed from component sources
 *  - `virtual:demo-metas`: each demo's `{ name?, category? }`
 *  - `virtual:component-modules`: `{ componentName → module }` for snippet imports
 *  - a transform tagging public index barrels with `__module` / `__name`
 *  - an `enforce: 'pre'` transform attaching helper `__code` to demo sources
 *
 * Returns two plugin objects. Vite's `enforce` is plugin-wide; the `__code`
 * transform reads a demo's raw TSX before JSX lowering and lives in its own
 * `enforce: 'pre'` object.
 *
 * `docsPlugin({ vitest: true })` keeps the real component-modules map and the
 * tagging transform, stubs api-reference and demo-metas with empty defaults,
 * and drops the demo `__code` pre-transform.
 */
export function docsPlugin({ vitest = false }: { vitest?: boolean } = {}): Plugin[] {
	// Resolved once in `configResolved`; shared by both returned plugin objects
	// via this closure.
	let srcDir = ''
	let demosDir = ''

	const main: Plugin = {
		name: 'docs',

		configResolved(config) {
			srcDir = findSrcDir(config.root)
			demosDir = path.resolve(config.root, 'demos')
		},

		...virtualJsonModules([
			{
				id: 'virtual:api-reference',
				generate: () => (vitest ? {} : buildApi(srcDir)),
				shouldInvalidate: (file) =>
					file.startsWith(srcDir) &&
					/\.tsx?$/.test(file) &&
					!file.includes(`${path.sep}docs${path.sep}`),
			},
			{
				id: 'virtual:demo-metas',
				generate: () => (vitest ? {} : generateDemoMetas(demosDir)),
				shouldInvalidate: (file) => file.startsWith(demosDir) && file.endsWith('.tsx'),
			},
			{
				id: 'virtual:component-modules',
				generate: () => buildNameMap(srcDir),
				shouldInvalidate: (file) => file.startsWith(srcDir),
			},
		]),

		// Tag every public component/provider/layout index barrel with
		// `__module` / `__name` for the runtime walker.
		transform(code, id) {
			const cleanId = id.split('?')[0] ?? ''

			const moduleName = moduleNameFor(cleanId, srcDir)

			if (!moduleName) return

			const tagged = buildTaggedBarrel(parseReExports(code, cleanId), moduleName)

			if (!tagged) return

			return { code: tagged, map: null }
		},
	}

	if (vitest) return [main]

	const pre: Plugin = {
		name: 'docs:pre',

		enforce: 'pre',

		// Attach each demo helper's full source as a `__code` static. Runs at
		// `enforce: 'pre'` on raw TSX, before JSX lowering.
		transform(code, id) {
			const cleanId = id.split('?')[0] ?? ''

			if (!cleanId.startsWith(demosDir + path.sep)) return

			if (!cleanId.endsWith('.tsx')) return

			const helpers = collectHelpers(code)

			if (helpers.length === 0) return

			const tail = helpers
				.map(({ name, code }) => `;Object.assign(${name}, { __code: ${JSON.stringify(code)} });`)
				.join('\n')

			return { code: `${code}\n\n${tail}\n`, map: null }
		},
	}

	return [pre, main]
}
