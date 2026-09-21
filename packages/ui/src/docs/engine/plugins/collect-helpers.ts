import ts from 'typescript'
import { isPascalCase, wordRe } from '../identifiers'
import { parseSource } from './ts-source'

type Helper = { name: string; code: string }

// The demo page's entry export, loaded via `import.meta.glob(…, { import: 'Demo'
// })`. It renders as the route body, never inside an `<Example>`, so its
// `__code` is never read — skip it rather than shipping the whole page source.
const ENTRY_EXPORT = 'Demo'

/** Whether a node's subtree holds a JSX element or fragment. */
function containsJsx(node: ts.Node): boolean {
	if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) {
		return true
	}

	// `forEachChild` yields the first truthy result its visitor returns, and
	// `undefined` once every child answers false.
	return node.forEachChild(containsJsx) ?? false
}

/**
 * Whether a function renders JSX, which is the test for a component. An arrow's
 * concise body counts, as does the expression of any `return` in a block body.
 * A nested function's returns are its own, so the search for `return` stops at
 * one. The returned expression is then searched whole, which is what lets
 * `return items.map((i) => <Option />)` count.
 *
 * @remarks
 * Replaces a `/(?:return|=>)\s*\(?\s*</` scan of the source text, which read
 * neither through a ternary (`return deleted ? <Text /> : <HoldButton />`) nor
 * past a comment between `=> (` and the tag. Both are ordinary demo shapes, and
 * both left the helper without its `__code` — so its `<Example>` showed no code
 * block at all.
 */
function rendersJsx(
	fn: ts.ArrowFunction | ts.FunctionExpression | ts.FunctionDeclaration,
): boolean {
	const { body } = fn

	if (!body) return false

	if (!ts.isBlock(body)) return containsJsx(body)

	let found = false

	const visit = (node: ts.Node) => {
		if (found) return

		if (ts.isFunctionLike(node)) return

		if (ts.isReturnStatement(node)) {
			if (node.expression && containsJsx(node.expression)) found = true

			return
		}

		node.forEachChild(visit)
	}

	visit(body)

	return found
}

/**
 * A top-level declaration a helper can reference but which isn't itself a
 * JSX-returning helper: type aliases, interfaces, and plain consts. `names`
 * lists the identifiers introduced; `code` is the full statement source for
 * verbatim prepending.
 */
type Preamble = { names: string[]; code: string }

/**
 * Returns the PascalCase name of a JSX-returning arrow / function-expression
 * declarator (`const Demo = () => <X />`), or null when `decl` isn't one.
 *
 * The JSX test runs against the initializer alone, not the surrounding
 * statement: in `const A = () => <X />, B = somethingElse`, only A matches.
 * This predicate drives both helper collection and the preamble exclusion.
 */
function jsxHelperName(decl: ts.VariableDeclaration): string | null {
	if (!ts.isIdentifier(decl.name)) return null

	if (!isPascalCase(decl.name.text)) return null

	const init = decl.initializer

	if (!init) return null

	if (!ts.isArrowFunction(init) && !ts.isFunctionExpression(init)) return null

	if (!rendersJsx(init)) return null

	return decl.name.text
}

function isJsxReturningVariableStatement(stmt: ts.VariableStatement): boolean {
	return stmt.declarationList.declarations.some((decl) => jsxHelperName(decl) !== null)
}

/**
 * Whether a top-level statement declares a JSX-returning helper component —
 * a PascalCase function declaration or arrow/function-expression declarator
 * whose body renders JSX. These belong to the `__code` pipeline, not to
 * declaration preambles: pulling one into a snippet would duplicate a whole
 * component the walker already renders.
 */
export function isJsxHelperStatement(stmt: ts.Statement): boolean {
	if (ts.isFunctionDeclaration(stmt) && stmt.name && isPascalCase(stmt.name.text) && stmt.body) {
		return rendersJsx(stmt)
	}

	if (ts.isVariableStatement(stmt)) return isJsxReturningVariableStatement(stmt)

	return false
}

function collectPreambles(sf: ts.SourceFile): Preamble[] {
	const preambles: Preamble[] = []

	for (const stmt of sf.statements) {
		if (ts.isTypeAliasDeclaration(stmt) || ts.isInterfaceDeclaration(stmt)) {
			preambles.push({ names: [stmt.name.text], code: stmt.getText(sf) })

			continue
		}

		if (ts.isVariableStatement(stmt)) {
			// JSX-returning helper statements belong to `collectHelpers`, not the
			// preamble.
			if (isJsxReturningVariableStatement(stmt)) continue

			const names: string[] = []

			for (const decl of stmt.declarationList.declarations) {
				if (ts.isIdentifier(decl.name)) names.push(decl.name.text)
			}

			if (names.length === 0) continue

			preambles.push({ names, code: stmt.getText(sf) })
		}
	}

	return preambles
}

/**
 * Prepends every preamble whose declared names appear (as whole-word matches)
 * in the helper's source. `preambles` is in source order, so the matches are
 * too.
 *
 * This is a name scan, not a reference graph: a preamble whose name appears
 * inside a string literal or comment in the helper is included.
 */
function prependReferencedPreamble(helperCode: string, preambles: Preamble[]): string {
	const matched = preambles.filter((preamble) =>
		preamble.names.some((name) => wordRe(name).test(helperCode)),
	)

	if (matched.length === 0) return helperCode

	return `${matched.map((p) => p.code).join('\n\n')}\n\n${helperCode}`
}

/**
 * Finds every PascalCase top-level function or const that returns JSX. It skips
 * the entry export `Demo`, the demo page itself. That renders as the route body
 * and never inside `<Example>`, so attaching its source only bloats the chunk
 * with a `__code` string nothing reads.
 *
 * Prepends each helper's source with any sibling type alias, interface, or
 * `const` declaration it references by name, producing a self-contained
 * snippet.
 */
export function collectHelpers(source: string, sourceFile?: ts.SourceFile): Helper[] {
	const sf = sourceFile ?? parseSource('demo.tsx', source)

	const preambles = collectPreambles(sf)

	const helpers: Helper[] = []

	for (const stmt of sf.statements) {
		if (ts.isFunctionDeclaration(stmt) && stmt.name && isPascalCase(stmt.name.text) && stmt.body) {
			// `ExportDefault` is the `Export | Default` pair, so the test is an
			// equality against both bits: a plain `export function` sets only one.
			const flags = ts.getCombinedModifierFlags(stmt)

			const isDefaultExport =
				(flags & ts.ModifierFlags.ExportDefault) === ts.ModifierFlags.ExportDefault

			if (isDefaultExport || stmt.name.text === ENTRY_EXPORT) continue

			if (!rendersJsx(stmt)) continue

			const code = stmt.getText(sf)

			helpers.push({ name: stmt.name.text, code: prependReferencedPreamble(code, preambles) })

			continue
		}

		if (ts.isVariableStatement(stmt)) {
			for (const decl of stmt.declarationList.declarations) {
				const name = jsxHelperName(decl)

				if (!name || name === ENTRY_EXPORT) continue

				helpers.push({ name, code: prependReferencedPreamble(stmt.getText(sf), preambles) })
			}
		}
	}

	return helpers
}
