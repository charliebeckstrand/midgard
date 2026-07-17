import fs from 'node:fs'
import path from 'node:path'
import { Node, Project, SyntaxKind } from 'ts-morph'
import ts from 'typescript'
import type { Plugin } from 'vite'
import { type ApiExtractor, createApiExtractor } from '../api-reference'
import { type DemoMeta, META_KEYS } from '../demo-meta'
import { collectHelpers } from './collect-helpers'
import { injectSourceFacts } from './source-facts'
import { virtualJsonModules } from './virtual-json'

// ---------------------------------------------------------------------------
// Demo metadata parsed for `virtual:demo-metas`
// ---------------------------------------------------------------------------

function isMetaKey(key: string): key is keyof DemoMeta {
	return (META_KEYS as readonly string[]).includes(key)
}

/**
 * Parse `export const meta = { name?: '...' }` out of a demo source file.
 * Drops unknown keys and non-string-literal values.
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

/**
 * Visit every demo `.tsx` under `demosDir` in a stable, sorted path order, so
 * the virtual modules built from the walk (`demo-metas`, `component-modules`)
 * serialize to identical bytes regardless of the filesystem's `readdir` order —
 * a source laptop and CI otherwise produce different chunk content, defeating
 * long-term caching.
 */
function forEachDemoFile(demosDir: string, visit: (fullPath: string) => void): void {
	if (!fs.existsSync(demosDir)) return

	const files = fs
		.readdirSync(demosDir, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile() && entry.name.endsWith('.tsx'))
		.map((entry) => path.join(entry.parentPath, entry.name))
		.sort()

	for (const full of files) visit(full)
}

function generateDemoMetas(demosDir: string): Record<string, DemoMeta> {
	const project = new Project({ useInMemoryFileSystem: true, skipLoadingLibFiles: true })

	const result: Record<string, DemoMeta> = {}

	forEachDemoFile(demosDir, (full) => {
		const rel = path.relative(demosDir, full).replaceAll(path.sep, '/')

		result[`./demos/${rel}`] = parseMeta(project, full, fs.readFileSync(full, 'utf-8'))
	})

	return result
}

// ---------------------------------------------------------------------------
// Component tagging: `virtual:component-modules` + the index-barrel transform
// ---------------------------------------------------------------------------

/**
 * A single named re-export parsed from a barrel: its source module, the local
 * (imported) name, the exported name, and whether the specifier is type-only.
 */
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

/**
 * Whether the barrel carries an export form {@link parseReExports} doesn't model
 * — a star re-export (`export * [as ns] from …`), a local `export {…}` without a
 * module specifier, `export default`, or a local `export const`/`function`.
 * {@link buildTaggedBarrel} regenerates the module from the parsed named
 * re-exports alone, so any such form would be silently dropped; the caller
 * leaves the barrel untagged instead of losing its exports.
 */
export function hasUnmodeledExports(source: string, fileName: string): boolean {
	const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)

	return sf.statements.some((stmt) => {
		if (ts.isExportDeclaration(stmt)) {
			return !stmt.moduleSpecifier || !stmt.exportClause || !ts.isNamedExports(stmt.exportClause)
		}

		if (ts.isExportAssignment(stmt)) return true

		const modifiers = ts.canHaveModifiers(stmt) ? ts.getModifiers(stmt) : undefined

		return modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false
	})
}

function isPascalCase(name: string): boolean {
	return /^[A-Z]/.test(name)
}

export type ExternalImport = { name: string; specifier: string }

// Packages whose imports never surface as external components: react hooks
// resolve through `collectSnippetImports`, and the renderer has no place in
// derived code.
const EXCLUDED_PACKAGES = /^(react|react-dom)(\/|$)/

/**
 * Parse the PascalCase named value imports a demo takes from external
 * packages (bare specifiers like `lucide-react`). Relative imports resolve
 * through the tagged ui barrels and stay out. Aliased specifiers record their
 * source name: the name matching the component's `displayName` and the
 * import a reader would write.
 */
export function parseExternalImports(source: string, fileName: string): ExternalImport[] {
	const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)

	const result: ExternalImport[] = []

	for (const stmt of sf.statements) {
		if (!ts.isImportDeclaration(stmt) || !ts.isStringLiteral(stmt.moduleSpecifier)) continue

		const specifier = stmt.moduleSpecifier.text

		if (specifier.startsWith('.') || EXCLUDED_PACKAGES.test(specifier)) continue

		const clause = stmt.importClause

		if (!clause || clause.isTypeOnly || !clause.namedBindings) continue

		if (!ts.isNamedImports(clause.namedBindings)) continue

		for (const spec of clause.namedBindings.elements) {
			if (spec.isTypeOnly) continue

			const name = (spec.propertyName ?? spec.name).text

			if (isPascalCase(name)) result.push({ name, specifier })
		}
	}

	return result
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

	// Modules carry the full `modules/<name>`, matching the canonical nested
	// public specifier (`ui/modules/grid`). The bare `ui/grid` shorthand also
	// resolves, but derived snippets show the canonical path.
	if (rel[0] === 'modules' && rel[2] === 'index.ts') return rel[1] ? `modules/${rel[1]}` : null

	return null
}

/**
 * A name-map value: a ui module name (string), or an external package entry
 * carrying its bare import specifier.
 */
type ModuleEntry = string | { module: string; external: true }

/**
 * Record every PascalCase value re-export of a single index file under
 * `moduleName`. Skips missing files.
 */
function collectIndexNames(
	result: Record<string, ModuleEntry>,
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
	result: Record<string, ModuleEntry>,
	dir: string,
	moduleFor: (name: string) => string,
): void {
	if (!fs.existsSync(dir)) return

	const dirs = fs
		.readdirSync(dir, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort()

	for (const name of dirs) {
		collectIndexNames(result, path.join(dir, name, 'index.ts'), moduleFor(name))
	}
}

/**
 * Record every external component imported by a demo (e.g. lucide icons)
 * under its bare package specifier. Runs after the ui collectors, and ui
 * names win collisions via `??=`: an external sharing a component's name
 * stays unresolvable rather than shadowing it.
 */
function collectDemoExternals(result: Record<string, ModuleEntry>, demosDir: string): void {
	forEachDemoFile(demosDir, (full) => {
		for (const { name, specifier } of parseExternalImports(fs.readFileSync(full, 'utf-8'), full)) {
			result[name] ??= { module: specifier, external: true }
		}
	})
}

/** The `virtual:component-modules` payload: the library's import prefix plus its name map. */
type ComponentModules = { packageName: string; names: Record<string, ModuleEntry> }

/**
 * Walk every public `components/*\/index.ts`, `providers/*\/index.ts`, and
 * `layouts/index.ts` at build time and collect `{ name → module }` for every
 * PascalCase value re-export, plus an external entry for every package
 * component the demos import (resolved at runtime by `displayName`). Absent
 * sub-directories are skipped, so a library without `providers/` or `layouts/`
 * needs no extra configuration. `packageName` rides along: `assemble` reads it
 * to prefix derived imports (`<packageName>/button`).
 */
function buildNameMap(srcDir: string, demosDir: string, packageName: string): ComponentModules {
	const names: Record<string, ModuleEntry> = {}

	collectDirNames(names, path.join(srcDir, 'components'), (name) => name)

	collectDirNames(names, path.join(srcDir, 'providers'), (name) => `providers/${name}`)

	collectDirNames(names, path.join(srcDir, 'modules'), (name) => `modules/${name}`)

	collectIndexNames(names, path.join(srcDir, 'layouts', 'index.ts'), 'layouts')

	// `demosDir` is the plugin's resolved demos path, not `srcDir/docs/demos`: the
	// two diverge when the `srcDir` option overrides source-root detection, and
	// recomputing from `srcDir` there would read a non-existent directory and drop
	// every external component from the name map.
	collectDemoExternals(names, demosDir)

	return { packageName, names }
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
 * Locate the library's source root (the directory holding `components/`)
 * relative to the Vite `root`. A docs build sets `root` to the site directory
 * (`src/docs`, so `..` is the source root); a test run sets `root` to the
 * package directory (so `src` is one level down). Try both. The plugin's
 * `srcDir` option overrides this lookup.
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
 *  - `virtual:api-reference-manifest`: `{ id → () => import(perComponentModule) }`
 *    over prop data parsed from component sources, one lazily-chunked
 *    `virtual:api-reference/<id>` module per component
 *  - `virtual:demo-metas`: each demo's `{ name? }`
 *  - `virtual:component-modules`: `{ componentName → module }` for snippet imports
 *  - a transform tagging public index barrels with `__module` / `__name`
 *  - an `enforce: 'pre'` transform attaching helper `__code` and per-Example
 *    `__facts` (source-facts synthesis) to demo sources
 *
 * Returns two plugin objects. Vite's `enforce` is plugin-wide; the `__code`
 * transform reads a demo's raw TSX before JSX lowering and lives in its own
 * `enforce: 'pre'` object.
 *
 * `docsPlugin({ vitest: true })` keeps the real component-modules map and the
 * tagging transform, stubs the api-reference manifest and demo-metas with empty
 * defaults, and drops the demo `__code` pre-transform.
 *
 * `packageName` is the documented library's import prefix (`ui`, `grid`, …),
 * baked into `virtual:component-modules` so derived snippets read
 * `<packageName>/button`. `srcDir` overrides the source-root auto-detection
 * (the directory holding `components/`); by default it is located relative to
 * the Vite `root`.
 */
export type DocsPluginOptions = { vitest?: boolean; packageName?: string; srcDir?: string }

export function docsPlugin({
	vitest = false,
	packageName = 'ui',
	srcDir: srcDirOption,
}: DocsPluginOptions = {}): Plugin[] {
	// Resolved once in `configResolved`; shared by both returned plugin objects
	// via this closure.
	let srcDir = srcDirOption ?? ''
	let demosDir = ''

	// Lazily created on first read so `vitest` builds never open a Project. One
	// long-lived extractor per plugin: it reuses its scoped ts-morph Project and
	// re-extracts only the barrels a changed file feeds.
	let extractor: ApiExtractor | null = null

	const apiExtractor = (): ApiExtractor => {
		extractor ??= createApiExtractor(srcDir)

		return extractor
	}

	const main: Plugin = {
		name: 'docs',

		configResolved(config) {
			srcDir = srcDirOption ?? findSrcDir(config.root)

			// Derive the demos dir from the resolved source root, not `config.root`:
			// a docs build roots at `src/docs` (so `config.root/demos` happens to
			// match), but a test run roots at the package dir, where only
			// `srcDir/docs/demos` points at the real demos. One source keeps every
			// consumer (metas, the name map, the `__code` transform) aligned.
			demosDir = path.join(srcDir, 'docs', 'demos')
		},

		...virtualJsonModules([
			{
				prefix: 'virtual:api-reference/',
				manifestId: 'virtual:api-reference-manifest',
				generate: () => (vitest ? {} : apiExtractor().getAll()),
				shouldInvalidate: (file) =>
					!vitest &&
					file.startsWith(srcDir) &&
					/\.tsx?$/.test(file) &&
					!file.includes(`${path.sep}docs${path.sep}`) &&
					apiExtractor().notifyChanged(file),
			},
			{
				id: 'virtual:demo-metas',
				generate: () => (vitest ? {} : generateDemoMetas(demosDir)),
				shouldInvalidate: (file) => file.startsWith(demosDir + path.sep) && file.endsWith('.tsx'),
			},
			{
				id: 'virtual:component-modules',
				generate: () => buildNameMap(srcDir, demosDir, packageName),
				shouldInvalidate: (file) => file.startsWith(srcDir),
			},
		]),

		// Tag every public component/provider/layout index barrel with
		// `__module` / `__name` for the runtime walker.
		transform(code, id) {
			const cleanId = id.split('?')[0] ?? ''

			const moduleName = moduleNameFor(cleanId, srcDir)

			if (!moduleName) return

			// Regenerating from the parsed named re-exports would drop any other
			// export form; leave such a barrel untagged rather than silently losing
			// its exports (a runtime break in dev and prod).
			if (hasUnmodeledExports(code, cleanId)) {
				console.warn(
					`docs: ${cleanId} mixes non-re-export forms; skipping component tagging to preserve its exports`,
				)

				return
			}

			const tagged = buildTaggedBarrel(parseReExports(code, cleanId), moduleName)

			if (!tagged) return

			return { code: tagged, map: null }
		},
	}

	if (vitest) return [main]

	const pre: Plugin = {
		name: 'docs:pre',

		enforce: 'pre',

		// Attach each demo helper's full source as a `__code` static, and inject
		// per-Example `__facts` (authored prop sources, referenced declarations,
		// import origins) for the walker's source-aware synthesis. Runs at
		// `enforce: 'pre'` on raw TSX, before JSX lowering, over one shared parse.
		transform(code, id) {
			const cleanId = id.split('?')[0] ?? ''

			if (!cleanId.startsWith(demosDir + path.sep)) return

			if (!cleanId.endsWith('.tsx')) return

			const sf = ts.createSourceFile(cleanId, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)

			const helpers = collectHelpers(code, sf)

			const withFacts = injectSourceFacts(code, { filePath: cleanId, srcDir }, sf)

			if (helpers.length === 0 && withFacts === null) return

			const tail = helpers
				.map(({ name, code }) => `;Object.assign(${name}, { __code: ${JSON.stringify(code)} });`)
				.join('\n')

			const base = withFacts ?? code

			return { code: tail ? `${base}\n\n${tail}\n` : base, map: null }
		},
	}

	return [pre, main]
}
