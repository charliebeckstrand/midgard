import ts from 'typescript'
import { isPascalCase, wordRe } from '../identifiers'
import { parseSource } from './ts-source'

type Helper = { name: string; code: string }

// The demo page's entry export, loaded via `import.meta.glob(…, { import: 'Demo'
// })`. It renders as the route body, never inside an `<Example>`, so its
// `__code` is never read — skip it rather than shipping the whole page source.
const ENTRY_EXPORT = 'Demo'

// Matches `return <Tag`, `return (<Tag`, `return <>`, `=> <Tag`, `=> (<Tag`, `=> <>`.
// Identifier-prefixed `<` (e.g. `useState<string>()`) doesn't match; the
// pattern requires `return` or `=>` immediately before the optional paren
// and `<`.
const JSX_RETURN = /(?:return|=>)\s*\(?\s*<[A-Za-z>]/

/**
 * A top-level declaration a helper may reference but which isn't itself a
 * JSX-returning helper: type aliases, interfaces, and plain consts. `names`
 * lists the identifiers introduced; `code` is the full statement source for
 * verbatim prepending.
 */
type Preamble = { names: string[]; code: string }

/**
 * Returns the PascalCase name of a JSX-returning arrow / function-expression
 * declarator (`const Demo = () => <X />`), or null when `decl` isn't one.
 *
 * The JSX test runs against the initializer's own source, not the surrounding
 * statement: in `const A = () => <X />, B = somethingElse`, only A matches.
 * This predicate drives both helper collection and the preamble exclusion.
 */
function jsxHelperName(decl: ts.VariableDeclaration, sf: ts.SourceFile): string | null {
	if (!ts.isIdentifier(decl.name)) return null

	if (!isPascalCase(decl.name.text)) return null

	const init = decl.initializer

	if (!init) return null

	if (!ts.isArrowFunction(init) && !ts.isFunctionExpression(init)) return null

	if (!JSX_RETURN.test(init.getText(sf))) return null

	return decl.name.text
}

function isJsxReturningVariableStatement(stmt: ts.VariableStatement, sf: ts.SourceFile): boolean {
	return stmt.declarationList.declarations.some((decl) => jsxHelperName(decl, sf) !== null)
}

/**
 * Whether a top-level statement declares a JSX-returning helper component —
 * a PascalCase function declaration or arrow/function-expression declarator
 * whose body renders JSX. These belong to the `__code` pipeline, not to
 * declaration preambles: pulling one into a snippet would duplicate a whole
 * component the walker already renders.
 */
export function isJsxHelperStatement(stmt: ts.Statement, sf: ts.SourceFile): boolean {
	if (ts.isFunctionDeclaration(stmt) && stmt.name && isPascalCase(stmt.name.text) && stmt.body) {
		return JSX_RETURN.test(stmt.getText(sf))
	}

	if (ts.isVariableStatement(stmt)) return isJsxReturningVariableStatement(stmt, sf)

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
			if (isJsxReturningVariableStatement(stmt, sf)) continue

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
 * Finds every PascalCase top-level function/const that returns JSX. Skips the
 * entry export `Demo` (the demo page itself) — it renders as the route body,
 * never inside `<Example>`, so attaching its source only bloats the chunk with
 * a `__code` string nothing reads.
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

			const code = stmt.getText(sf)

			if (!JSX_RETURN.test(code)) continue

			helpers.push({ name: stmt.name.text, code: prependReferencedPreamble(code, preambles) })

			continue
		}

		if (ts.isVariableStatement(stmt)) {
			for (const decl of stmt.declarationList.declarations) {
				const name = jsxHelperName(decl, sf)

				if (!name || name === ENTRY_EXPORT) continue

				helpers.push({ name, code: prependReferencedPreamble(stmt.getText(sf), preambles) })
			}
		}
	}

	return helpers
}
