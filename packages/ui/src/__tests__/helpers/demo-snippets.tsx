import { getLibFiles } from '@ts-morph/common'
import { ts } from 'ts-morph'
import { describe, expect, it } from 'vitest'
import { type DemoPage, demoPages, walkOf } from './demo-pages'

// A gate on the text of each "Show code" block of the docs site. Two test
// files in `docs/` run it with the smoke test, and each file gives the two gates
// a part of the pages, so that the test shards in CI can balance the pages.
//
// A reader copies the block, so a block that does not compile teaches a bug.
// The block derives at run time from the rendered tree of an Example and from
// the source that the `docs:pre` transform attaches at build time.
// `demo-code-block.test.ts` asks whether a block exists. This gate reads the
// block itself.
//
// It renders each demo page, opens each tab, and opens each "Show code". The
// smoke test (`demo-smoke.tsx`) reads the same walk (`walkOf` in
// `demo-pages.tsx`), so a page renders once for the two gates. The gate then
// checks each block as one TSX module, on its own, with the DOM lib and
// no import resolution. A block fails on a syntax error, on a name that it
// declares twice, or on a name that it uses and neither declares nor imports.
// A derived block with none of those also fails on an import or a top-level
// declaration that it never uses: a name that the walk pulled by mistake. The
// gate does not type-check the block against ui, so a wrong prop passes.
//
// A block reads as imports, then declarations, then the JSX of the Example as
// sibling elements. `asModule` wraps that JSX in a component, so the siblings
// parse. A derived block always has an import, because `deriveCode` returns
// null without one. A hand-written `code` override has none. It is a fragment,
// and it names state that it does not declare (`value`, `onValueChange`) on
// purpose, so it gets the syntax check alone. An override that elides (`…`, or
// `...` that is not a spread) or holds no JSX is pseudo-code, and the gate
// skips it.
//
// `KNOWN_FAILURES` lists the blocks that fail today. Each page must match its
// entries: a new failure fails the gate, and so does an entry whose block now
// compiles. A case for each page keeps each case inside the time limit.

/**
 * The blocks that fail the gate today, keyed `page › example`, with the first
 * diagnostic of each. Fix a block, and remove its entry.
 */
const KNOWN_FAILURES: Record<string, string> = {}

// The semantic diagnostics that the gate keeps: a name declared twice, or a
// name used and never declared. The others are out of scope. The checker
// resolves no import and has no types for React or ui, so it reports an
// unresolved module, untyped JSX, and a wrong prop for every block.
const NAME_DIAGNOSTICS = new Set([
	2300, // Duplicate identifier.
	2304, // Cannot find name.
	2393, // Duplicate function implementation.
	2440, // Import declaration conflicts with local declaration.
	2451, // Cannot redeclare block-scoped variable.
	2503, // Cannot find namespace.
	2552, // Cannot find name. Did you mean …?
])

// The diagnostics of a name that the block declares or imports and never
// uses, with `noUnusedLocals` on.
const UNUSED_DIAGNOSTICS = new Set([
	6133, // 'x' is declared but its value is never read.
	6192, // All imports in import declaration are unused.
	6196, // 'x' is declared but never used.
	6198, // All destructured elements are unused.
])

const LIB_DIR = '/lib'

const libFiles = new Map(
	getLibFiles().map(({ fileName, text }) => [`${LIB_DIR}/${fileName}`, text]),
)

const libSourceFiles = new Map<string, ts.SourceFile>()

/** The component that `asModule` wraps the JSX of a block in. */
const SNIPPET_COMPONENT = '__Snippet'

/** An elision in a hand-written override: `…`, or `...` that is not a spread. */
const ELISION = /…|\.\.\.(?![\w$[{(])/

/** Whether a block is a hand-written override that is not meant to compile. */
function isPseudoCode(snippet: string): boolean {
	return !/^import /m.test(snippet) && (ELISION.test(snippet) || !/<[A-Za-z]/.test(snippet))
}

/**
 * `code` as a TSX module. The walker's `{...}`, a value it cannot print, reads
 * as `undefined`. The JSX from its first element at column 0 is wrapped in a
 * component, and an override that is an object literal in parentheses.
 */
function asModule(code: string): string {
	if (code.startsWith('{')) return `;(${code})`

	const lines = code.replaceAll('{...}', '{undefined}').split('\n')

	const start = lines.findIndex((line) => line.startsWith('<'))

	if (start === -1) return lines.join('\n')

	return [
		...lines.slice(0, start),
		`export function ${SNIPPET_COMPONENT}() {`,
		'return (<>',
		...lines.slice(start),
		'</>)',
		'}',
	].join('\n')
}

/**
 * The diagnostics of each block of a page, as `TS2304: …` lines: syntax, and
 * for a derived block the names that it declares twice or does not declare.
 *
 * One program checks all the derived blocks of the page, because a program
 * costs far more to build than to read, and the page can show 45 blocks. Each
 * derived block has an import, so it is a module and keeps its names to
 * itself. A hand-written override has no import, so it is a script, and its
 * top-level names are global. It can declare a name that a derived block uses
 * and does not declare. The overrides thus go in a second program, which
 * reads syntax alone, and syntax does not cross files.
 */
function diagnoseAll(snippets: ReadonlyMap<string, string>): Map<string, string[]> {
	const modules = new Map<string, string>()

	const scripts = new Map<string, string>()

	const titles = new Map<string, string>()

	for (const [title, snippet] of snippets) {
		const file = `/snippet-${titles.size}.tsx`

		titles.set(file, title)

		;(/^import /m.test(snippet) ? modules : scripts).set(file, asModule(snippet))
	}

	const diagnosed = new Map<string, string[]>()

	for (const [file, diagnostics] of [
		...diagnoseFiles(modules, true),
		...diagnoseFiles(scripts, false),
	]) {
		diagnosed.set(titles.get(file) ?? file, diagnostics)
	}

	return diagnosed
}

/** The diagnostics of each file of one program, keyed by file name. */
function diagnoseFiles(
	files: ReadonlyMap<string, string>,
	derived: boolean,
): Map<string, string[]> {
	const diagnosed = new Map<string, string[]>()

	if (files.size === 0) return diagnosed

	const host: ts.CompilerHost = {
		fileExists: (file) => files.has(file) || libFiles.has(file),
		readFile: (file) => files.get(file) ?? libFiles.get(file),
		writeFile: () => {},
		getSourceFile: (file, target) => {
			const code = files.get(file)

			if (code !== undefined) {
				return ts.createSourceFile(file, code, target, true, ts.ScriptKind.TSX)
			}

			let cached = libSourceFiles.get(file)

			const text = libFiles.get(file)

			if (!cached && text !== undefined) {
				cached = ts.createSourceFile(file, text, target, true)

				libSourceFiles.set(file, cached)
			}

			return cached
		},
		getDefaultLibFileName: () => `${LIB_DIR}/lib.d.ts`,
		getCurrentDirectory: () => '/',
		getCanonicalFileName: (file) => file,
		useCaseSensitiveFileNames: () => true,
		getNewLine: () => '\n',
	}

	const program = ts.createProgram({
		rootNames: [...files.keys()],
		options: {
			target: ts.ScriptTarget.ES2022,
			module: ts.ModuleKind.ESNext,
			jsx: ts.JsxEmit.Preserve,
			lib: ['lib.es2023.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
			noResolve: true,
			noUnusedLocals: true,
			skipLibCheck: true,
			types: [],
		},
		host,
	})

	for (const [file, code] of files) {
		const sf = program.getSourceFile(file)

		const syntactic = program.getSyntacticDiagnostics(sf)

		const semantic = syntactic.length > 0 || !derived ? [] : program.getSemanticDiagnostics(sf)

		const names = semantic.filter((d) => NAME_DIAGNOSTICS.has(d.code))

		const diagnostics =
			syntactic.length > 0 || !derived
				? syntactic
				: names.length > 0
					? names
					: unusedOf(semantic, sf, code.includes(SNIPPET_COMPONENT))

		diagnosed.set(
			file,
			diagnostics.map((d) => `TS${d.code}: ${messageOf(d)}`),
		)
	}

	return diagnosed
}

function messageOf(diagnostic: ts.Diagnostic): string {
	return ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')
}

/** The deepest node of `sf` that holds `position`. */
function nodeAt(sf: ts.SourceFile, position: number): ts.Node {
	let found: ts.Node = sf

	const visit = (node: ts.Node) => {
		if (node.getStart(sf) > position || position >= node.getEnd()) return

		found = node

		ts.forEachChild(node, visit)
	}

	ts.forEachChild(sf, visit)

	return found
}

/**
 * Whether a node names what the block itself declares: an import, or a name
 * that a top-level statement declares. A parameter, a type parameter, and a
 * local of a helper are authored code, so they do not count.
 */
function isBlockName(node: ts.Node): boolean {
	// The walk starts at the node itself: an unused import line reports on the
	// declaration, not on a name inside it.
	for (let current: ts.Node | undefined = node; current; current = current.parent) {
		if (ts.isImportDeclaration(current)) return true

		if (ts.isParameter(current) || ts.isTypeParameterDeclaration(current)) return false

		if (ts.isBlock(current)) return false

		if (current.parent !== undefined && ts.isSourceFile(current.parent)) return true
	}

	return false
}

/**
 * The unused-name diagnostics of the block's own imports and top-level
 * declarations. A block with no JSX shows one helper on its own. It declares
 * that helper and never uses it, so the last unused PascalCase name is exempt
 * there.
 */
function unusedOf(
	diagnostics: readonly ts.Diagnostic[],
	sf: ts.SourceFile | undefined,
	hasJsx: boolean,
): ts.Diagnostic[] {
	if (!sf) return []

	const unused = diagnostics.filter(
		(d) =>
			UNUSED_DIAGNOSTICS.has(d.code) && d.start !== undefined && isBlockName(nodeAt(sf, d.start)),
	)

	if (hasJsx) return unused

	const shown = unused.findLast((d) => /^'[A-Z]/.test(messageOf(d)))

	return unused.filter((d) => d !== shown)
}

/** The entries of `KNOWN_FAILURES` for one page. */
function knownFailuresOf(page: string): Record<string, string> {
	return Object.fromEntries(
		Object.entries(KNOWN_FAILURES).filter(([key]) => key.startsWith(`${page} › `)),
	)
}

/**
 * Registers a snippet case for each page of `pages`, and the check of the page
 * names in `KNOWN_FAILURES` against all the pages.
 */
export function describeDemoSnippets(pages: readonly DemoPage[]): void {
	describe('demo snippets', () => {
		it.each(pages)(
			'%s derives blocks that compile',
			// The case that walks a page also runs axe on it for the smoke test, so
			// it takes the time limit of the smoke case. The grid page opens about
			// 45 blocks across its tabs.
			{ timeout: 60_000 },
			async (page, load) => {
				const { snippets, harvestLogged } = await walkOf(page, load)

				expect(harvestLogged, 'the console had output while a block was open').toEqual([])

				// Each page shows at least one block, so an empty harvest is a broken gate.
				expect(snippets.size, 'no "Show code" block was read').toBeGreaterThan(0)

				const checked = new Map([...snippets].filter(([, code]) => !isPseudoCode(code)))

				const failures: Record<string, string> = {}

				for (const [title, [first]] of diagnoseAll(checked)) {
					if (first) failures[`${page} › ${title}`] = first
				}

				expect(failures).toEqual(knownFailuresOf(page))
			},
		)

		it('names only pages that exist in its known failures', () => {
			const names = new Set(demoPages.map(([page]) => page))

			const unknown = Object.keys(KNOWN_FAILURES).filter(
				(key) => !names.has(key.split(' › ')[0] ?? ''),
			)

			expect(unknown).toEqual([])
		})
	})
}
