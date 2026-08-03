import { readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { srcDir } from '../helpers/walk-source'

// CONVENTIONS.md §12.1 requires a doccomment on every symbol a barrel
// re-exports. The rule drifted before this test existed: a sweep found 37
// undocumented exports across the a11y option and return shapes, the Sidebar
// props aliases, the types-only recipe barrel, and the toast types.
//
// A text scan cannot decide this. A doccomment legally sits in one of three
// places, and only the first is a plain declaration:
//
//   1. On the declaration     — /** … */ export type Foo = …
//   2. On an export specifier — export { /** … */ Body as DialogBody }
//   3. On a destructured pair — /** … */ export const [Ctx, useCtx] =
//                               createContext<T>('Name')
//
// A scan that reads only case 1 reports a false gap for the slot re-export
// family (Dialog/Drawer/Sheet/Listbox) and for every `createContext` hook. So
// this test walks the real export chain with the compiler API and accepts a
// doccomment at any hop, which is what a consumer's editor resolves.
//
// Building that program makes this the slowest test in its project by a wide
// margin — ~1.4s against a 72ms median — so it reads no more than it resolves
// (see `packageHost`), and the project's own `testTimeout` in `vitest.config.ts`
// is sized for it. It stays in the boundary project because it pins a
// convention, not a behaviour.

/** Barrel globs that form the package's public surface, per `package.json` `exports`. */
const BARREL_PATTERNS: readonly (readonly [dir: string, nested: boolean])[] = [
	['core', false],
	['hooks', false],
	['layouts', false],
	['recipes', false],
	['utilities', false],
	['types', false],
	['components', true],
	['modules', true],
	['primitives', true],
	['providers', true],
]

/** Absolute paths of every barrel the public surface exposes. */
function barrelFiles(): string[] {
	const files: string[] = []

	for (const [dir, nested] of BARREL_PATTERNS) {
		const root = join(srcDir, dir)

		if (!nested) {
			files.push(join(root, 'index.ts'))

			continue
		}

		for (const entry of readdirSync(root, { withFileTypes: true })) {
			if (!entry.isDirectory()) continue

			files.push(join(root, entry.name, 'index.ts'))
		}
	}

	return files.filter((file) => ts.sys.fileExists(file))
}

/**
 * Compiler options the program builds under; shared with {@link packageHost}.
 *
 * @remarks `noLib` drops the standard library, which is 93 files and 3MB of the
 * text the program would otherwise parse — the single largest share, and read by
 * nothing here (see {@link packageHost}). It is stated rather than left to the
 * path rule below, which would catch `lib.*.d.ts` only for as long as the
 * `typescript` package keeps resolving under a `node_modules` segment.
 */
const PROGRAM_OPTIONS: ts.CompilerOptions = {
	target: ts.ScriptTarget.ESNext,
	module: ts.ModuleKind.ESNext,
	moduleResolution: ts.ModuleResolutionKind.Bundler,
	jsx: ts.JsxEmit.Preserve,
	skipLibCheck: true,
	noLib: true,
}

/**
 * A compiler host that resolves every import but parses only the sources this
 * test can read a doccomment out of, handing back an empty file for the rest.
 *
 * @remarks The barrels reach the whole dependency graph, and parsing it is where
 * the run goes — 70% of it, against 2% for the walk. Withholding the text of
 * every dependency, on top of the library `PROGRAM_OPTIONS` drops, takes the
 * program from 1,642 files and 11.2MB to 1,232 and 3.7MB, and the build behind
 * this test from ~2.1s to ~1.2s.
 *
 * None of it is read. The walk reports only on declarations this package wrote,
 * and across all 1,236 barrel exports no hop of any alias chain lands in a
 * dependency — verified by diffing the per-export verdicts against the full
 * program. Resolution itself is untouched, so a re-export *through* a dependency
 * still resolves; only the file's text is withheld. Were the package to start
 * re-exporting a third-party symbol, that symbol would carry no readable
 * doccomment here and the test would report it as a gap — a loud failure rather
 * than a silent pass.
 *
 * The standing precondition, since both cuts land on the same side of it: no
 * type in this program resolves. Only declaration nodes and comment trivia are
 * valid to read from it, which is all {@link hasDoc} asks for.
 */
function packageHost(): ts.CompilerHost {
	const host = ts.createCompilerHost(PROGRAM_OPTIONS)

	const read = host.getSourceFile.bind(host)

	// One call per path — the program dedupes before reaching the host — so the
	// empty files are built on demand and never cached.
	host.getSourceFile = (fileName, languageVersion, onError, shouldCreate) =>
		fileName.includes('/node_modules/')
			? ts.createSourceFile(fileName, '', languageVersion)
			: read(fileName, languageVersion, onError, shouldCreate)

	return host
}

/**
 * Every hop of a symbol's re-export chain, nearest first. A doccomment on any
 * hop reaches the consumer, so all of them are read before a gap is reported.
 */
function aliasChain(checker: ts.TypeChecker, symbol: ts.Symbol): ts.Symbol[] {
	const chain = [symbol]

	let cursor = symbol

	// Bounded: a re-export chain deeper than this is a structural problem the
	// filename and barrel boundary tests already catch.
	for (let hop = 0; hop < 12 && cursor.flags & ts.SymbolFlags.Alias; hop++) {
		const next = checker.getImmediateAliasedSymbol(cursor)

		if (!next || chain.includes(next)) break

		chain.push(next)

		cursor = next
	}

	return chain
}

/** True when `node`'s leading trivia opens with a doccomment. */
function leadingDoc(node: ts.Node): boolean {
	const source = node.getSourceFile().getFullText()

	const ranges = ts.getLeadingCommentRanges(source, node.getFullStart()) ?? []

	return ranges.some((range) => source.slice(range.pos, range.end).startsWith('/**'))
}

/** True when any hop of `chain` carries a `/** … *\/` doccomment. */
function hasDoc(chain: readonly ts.Symbol[]): boolean {
	for (const hop of chain) {
		for (const declaration of hop.getDeclarations() ?? []) {
			// A variable declaration and a destructured binding both carry their
			// doccomment on the enclosing statement, not on the declaration.
			let node: ts.Node = declaration

			while (node && ts.isBindingElement(node)) node = node.parent

			if (ts.isVariableDeclaration(node) || ts.isVariableDeclarationList(node)) {
				node = ts.isVariableDeclaration(node) ? node.parent.parent : node.parent
			}

			if (ts.getJSDocCommentsAndTags(node).some((doc) => ts.isJSDoc(doc))) return true

			// An export specifier's doccomment is leading trivia, which the JSDoc
			// parser does not attach to the specifier node.
			if (leadingDoc(node)) return true

			// A lone re-export carries its doccomment above the statement rather
			// than inside the braces — `/** … */ export { useFormActions }`. Only a
			// single-specifier clause qualifies: a doc above a multi-name clause
			// documents none of them in particular.
			if (ts.isExportSpecifier(node)) {
				const clause = node.parent

				if (clause.elements.length === 1 && leadingDoc(clause.parent)) return true
			}
		}
	}

	return false
}

describe('TSDoc coverage boundary', () => {
	it('every barrel-exported symbol carries a doccomment', () => {
		const barrels = barrelFiles()

		const program = ts.createProgram(barrels, PROGRAM_OPTIONS, packageHost())

		const checker = program.getTypeChecker()

		const violations: string[] = []

		for (const barrel of barrels) {
			const source = program.getSourceFile(barrel)

			if (!source) {
				violations.push(`${relative(srcDir, barrel)} → unparsed`)

				continue
			}

			const moduleSymbol = checker.getSymbolAtLocation(source)

			if (!moduleSymbol) continue

			for (const exported of checker.getExportsOfModule(moduleSymbol)) {
				if (hasDoc(aliasChain(checker, exported))) continue

				violations.push(`${relative(srcDir, barrel)} → ${exported.getName()}`)
			}
		}

		expect(
			violations,
			`barrel exports with no doccomment (CONVENTIONS.md §12.1):\n${violations.join('\n')}`,
		).toEqual([])
	})
})
