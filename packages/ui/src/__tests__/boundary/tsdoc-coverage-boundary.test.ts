import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import {
	getLeadingCommentRanges,
	isBindingElement,
	isExportSpecifier,
	isNamedExports,
	isVariableDeclaration,
	isVariableDeclarationList,
	type Node,
} from 'typescript/unstable/ast'
import {
	type Checker,
	type Project,
	SymbolFlags,
	type Symbol as TsSymbol,
} from 'typescript/unstable/sync'
import { afterAll, describe, expect, it } from 'vitest'
import { docComments } from '../helpers/ts-ast'
import { startTypeScript } from '../helpers/ts-server'
import { srcDir, srcRelative } from '../helpers/walk-source'

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
// (see `withheld`), and the project's own `testTimeout` in `vitest.config.ts`
// is sized for it. It stays in the boundary project because it pins a
// convention, not a behavior.

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
	['structure', true],
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

	return files.filter((file) => existsSync(file))
}

/**
 * Compiler options the program builds under, as a tsconfig file writes them.
 *
 * @remarks `noLib` drops the standard library, which is 93 files and 3MB of the
 * text the program would otherwise parse — the single largest share, and read by
 * nothing here (see {@link withheld}). It is stated rather than left to the
 * path rule below, which would catch `lib.*.d.ts` only for as long as the
 * `typescript` package keeps resolving under a `node_modules` segment.
 */
const PROGRAM_OPTIONS = {
	target: 'esnext',
	module: 'esnext',
	moduleResolution: 'bundler',
	jsx: 'preserve',
	skipLibCheck: true,
	noLib: true,
}

/**
 * Whether the TypeScript server reads `file` as empty text. The program
 * resolves every import, but the server parses only the sources that this test
 * can read a doccomment from. The resolution of an import needs the
 * `package.json` of a dependency, so the server reads it. The server reads
 * each other file of a dependency as empty text.
 *
 * @remarks The barrels reach the whole dependency graph. The server withholds
 * the text of each dependency, and `PROGRAM_OPTIONS` drops the library. The
 * program then has 1,602 files and 6.3MB of text, in place of 2,031 files and
 * 11.3MB. The server parses in parallel, so the program builds in
 * approximately 1.0s, in place of 1.2s. The walk takes approximately 0.7s,
 * because each hop of an alias chain is a call to the server.
 *
 * None of it is read. The walk reports only on declarations this package wrote,
 * and across all 1,532 barrel exports no hop of any alias chain lands in a
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
function withheld(file: string): boolean {
	return file.includes('/node_modules/') && !file.endsWith('/package.json')
}

/**
 * Every hop of a symbol's re-export chain, nearest first. A doccomment on any
 * hop reaches the consumer, so all of them are read before a gap is reported.
 */
function aliasChain(checker: Checker, symbol: TsSymbol): TsSymbol[] {
	const chain = [symbol]

	let cursor = symbol

	// Bounded: a re-export chain deeper than this is a structural problem the
	// filename and barrel boundary tests already catch.
	for (let hop = 0; hop < 12 && cursor.flags & SymbolFlags.Alias; hop++) {
		const next = checker.getImmediateAliasedSymbol(cursor)

		// A symbol of the API is a handle, and its id names the symbol of the
		// checker.
		if (!next || chain.some((symbol) => symbol.id === next.id)) break

		chain.push(next)

		cursor = next
	}

	return chain
}

/** True when `node`'s leading trivia opens with a doccomment. */
function leadingDoc(node: Node): boolean {
	const source = node.getSourceFile().text

	const ranges = getLeadingCommentRanges(source, node.getFullStart()) ?? []

	return ranges.some((range) => source.slice(range.pos, range.end).startsWith('/**'))
}

/** True when any hop of `chain` carries a `/** … *\/` doccomment. */
function hasDoc(project: Project, chain: readonly TsSymbol[]): boolean {
	for (const hop of chain) {
		for (const handle of hop.declarations) {
			const declaration = handle.resolve(project)

			// A declaration that the project cannot give has no doccomment to read,
			// so the export stays a gap.
			if (!declaration) continue

			// A variable declaration and a destructured binding both carry their
			// doccomment on the enclosing statement, not on the declaration.
			let node: Node = declaration

			while (isBindingElement(node)) node = node.parent

			if (isVariableDeclaration(node) || isVariableDeclarationList(node)) {
				node = isVariableDeclaration(node) ? node.parent.parent : node.parent
			}

			if (docComments(node).length > 0) return true

			// An export specifier's doccomment is leading trivia, which the JSDoc
			// parser does not attach to the specifier node.
			if (leadingDoc(node)) return true

			// A lone re-export carries its doccomment above the statement rather
			// than inside the braces — `/** … */ export { useFormActions }`. Only a
			// single-specifier clause qualifies: a doc above a multi-name clause
			// documents none of them in particular.
			if (isExportSpecifier(node)) {
				const clause = node.parent

				// The parent of a specifier is always its clause. The type of
				// TypeScript 7 gives the parent only as a node.
				if (isNamedExports(clause) && clause.elements.length === 1 && leadingDoc(clause.parent)) {
					return true
				}
			}
		}
	}

	return false
}

describe('TSDoc coverage boundary', () => {
	const server = startTypeScript(withheld)

	afterAll(() => server.close())

	it('every barrel-exported symbol carries a doccomment', () => {
		const barrels = barrelFiles()

		const project = server.open(barrels, PROGRAM_OPTIONS)

		const { program, checker } = project

		const violations: string[] = []

		for (const barrel of barrels) {
			const source = program.getSourceFile(barrel)

			if (!source) {
				violations.push(`${srcRelative(barrel)} → unparsed`)

				continue
			}

			const moduleSymbol = checker.getSymbolAtLocation(source)

			if (!moduleSymbol) continue

			for (const exported of checker.getExportsOfModule(moduleSymbol)) {
				if (hasDoc(project, aliasChain(checker, exported))) continue

				violations.push(`${srcRelative(barrel)} → ${exported.name}`)
			}
		}

		expect(
			violations,
			`barrel exports with no doccomment (CONVENTIONS.md §12.1):\n${violations.join('\n')}`,
		).toEqual([])
	})
})
