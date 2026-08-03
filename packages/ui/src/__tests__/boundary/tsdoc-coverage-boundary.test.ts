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
// The `getTypeChecker` call makes this the one boundary test that type-checks
// its inputs, so it is slower than its siblings. It stays in the boundary
// project because it pins a convention, not a behaviour.

/**
 * Wall-clock budget for the one test below, in place of the suite default.
 *
 * @remarks Resolving the export chains means building a TypeScript program over
 * every barrel, which pulls the whole source tree in: ~1,650 files, ~2.6s on an
 * idle machine, against a 36x faster median of 72ms across the rest of this
 * project. The suite default (5s locally) is sized for that median and for RTL
 * waits, and left this test barely two times its own cost — which the pre-push
 * gate then spends, running the suite beside `build` and `check-types` under
 * `turbo`. It timed out there on load alone, which is the one thing a budget
 * must never encode (see the `testTimeout` note in `vitest.config.ts`).
 *
 * Held flat rather than scaled for CI: the contention this covers is heaviest
 * on a developer's machine, not on an agent. The figure is a hang stop, not a
 * performance bound — a program build that has not finished by here is stuck,
 * not slow.
 */
const PROGRAM_BUDGET_MS = 30_000

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
	it('every barrel-exported symbol carries a doccomment', { timeout: PROGRAM_BUDGET_MS }, () => {
		const barrels = barrelFiles()

		const program = ts.createProgram(barrels, {
			target: ts.ScriptTarget.ESNext,
			module: ts.ModuleKind.ESNext,
			moduleResolution: ts.ModuleResolutionKind.Bundler,
			jsx: ts.JsxEmit.Preserve,
			skipLibCheck: true,
		})

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
