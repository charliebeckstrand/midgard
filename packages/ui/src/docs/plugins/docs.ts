import fs from 'node:fs'
import path from 'node:path'
import { Node, Project, SyntaxKind } from 'ts-morph'
import ts from 'typescript'
import type { Plugin } from 'vite'
import { buildApi } from '../api-reference'
import { collectHelpers } from './derive-code/collect-helpers'
import { virtualJsonModules } from './virtual-json'

// ---------------------------------------------------------------------------
// Demo metadata — parsed for `virtual:demo-metas`
// ---------------------------------------------------------------------------

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
// Component tagging — `virtual:component-modules` + the index-barrel transform
// ---------------------------------------------------------------------------

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

/**
 * Map a public index file to its module name, or null if the file isn't a
 * taggable barrel. The `docs/` prefix is never matched — that is the sole
 * mechanism keeping docs-internal controls out of derived code blocks
 * (see chrome-contract.test.ts).
 */
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

	if (!dir) throw new Error(`docs plugin: could not locate src dir from ${root}`)

	return dir
}

// ---------------------------------------------------------------------------
// The plugin
// ---------------------------------------------------------------------------

/**
 * The single Vite plugin backing the docs site. It folds what used to be five
 * separate plugins:
 *
 *  - `virtual:api-reference`     — prop data parsed from component sources
 *  - `virtual:demo-metas`        — each demo's `{ name?, category? }`
 *  - `virtual:component-modules` — `{ componentName → module }` for snippet imports
 *  - a transform tagging public index barrels with `__module` / `__name`
 *  - an `enforce: 'pre'` transform attaching helper `__code` to demo sources
 *
 * It returns TWO plugin objects, not one, and that split is load-bearing:
 * Vite's `enforce` is plugin-wide, so the `__code` transform — which has to read
 * a demo's *raw* TSX (before the JSX transform lowers it) so `collectHelpers`
 * can slice helper source — must live in its own `enforce: 'pre'` object.
 * Collapsing the two for tidiness would silently move `__code` attachment after
 * JSX lowering and break snippet extraction with no failing unit test.
 *
 * `docsPlugin({ vitest: true })` keeps the real component-modules map and the
 * tagging transform (the derive-code tests depend on both being real) while
 * stubbing api-reference and demo-metas with empty defaults and dropping the
 * demo `__code` pre-transform — matching exactly what the vitest run needs.
 */
export function docsPlugin({ vitest = false }: { vitest?: boolean } = {}): Plugin[] {
	// Resolved once in `configResolved` and shared by both returned objects via
	// this closure. `findSrcDir` locates the dir holding `components/` from either
	// the docs root (`src/docs` → `src`) or the vitest root (`packages/ui` → `src`).
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

		// Tag every public component/provider/layout index barrel so the runtime
		// walker can recognise the components a demo renders.
		transform(code, id) {
			const cleanId = id.split('?')[0] ?? ''

			const moduleName = moduleNameFor(cleanId, srcDir)

			if (!moduleName) return

			const suffix = buildTagSuffix(parseReExports(code, cleanId), moduleName)

			if (!suffix) return

			return { code: code + suffix, map: null }
		},
	}

	if (vitest) return [main]

	const pre: Plugin = {
		name: 'docs:pre',

		enforce: 'pre',

		// Attach each demo helper's full source as a `__code` static so the walker
		// can show the helper's body instead of an opaque `<Helper />` tag. Must
		// see raw TSX, hence `enforce: 'pre'`.
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
