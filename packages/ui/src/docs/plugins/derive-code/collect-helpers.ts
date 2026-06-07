import ts from 'typescript'

type Helper = { name: string; code: string }

function isDefaultExport(modifiers: readonly ts.ModifierLike[] | undefined): boolean {
	if (!modifiers) return false

	let hasExport = false
	let hasDefault = false

	for (const mod of modifiers) {
		if (mod.kind === ts.SyntaxKind.ExportKeyword) hasExport = true
		if (mod.kind === ts.SyntaxKind.DefaultKeyword) hasDefault = true
	}

	return hasExport && hasDefault
}

// Matches `return <Tag`, `return (<Tag`, `return <>`, `=> <Tag`, `=> (<Tag`, `=> <>`.
// Identifier-prefixed `<` (e.g. `useState<string>()`) doesn't match because
// the lookbehind requires `return` or `=>` immediately before the optional
// paren and `<`.
const JSX_RETURN = /(?:return|=>)\s*\(?\s*<[A-Za-z>]/

/**
 * A top-level declaration that a helper may reference but which isn't itself
 * a JSX-returning helper — type aliases, interfaces, and plain consts. The
 * `names` are the identifiers the statement introduces; `code` is the full
 * statement source so it can be prepended verbatim when referenced.
 */
type Preamble = { names: string[]; code: string; index: number }

/**
 * The PascalCase name of a JSX-returning arrow / function-expression
 * declarator (`const Demo = () => <X />`), or null when `decl` isn't one.
 *
 * The JSX test runs against the initializer's own source, not the surrounding
 * statement: a multi-declarator `const A = () => <X />, B = somethingElse`
 * would otherwise flag B because the JSX return lives anywhere in the shared
 * statement text. This single predicate drives both helper collection and the
 * preamble exclusion, so the two stay in lockstep.
 */
function jsxHelperName(
	decl: ts.VariableDeclaration,
	sf: ts.SourceFile,
	source: string,
): string | null {
	if (!ts.isIdentifier(decl.name)) return null

	if (!/^[A-Z]/.test(decl.name.text)) return null

	const init = decl.initializer

	if (!init) return null

	if (!ts.isArrowFunction(init) && !ts.isFunctionExpression(init)) return null

	if (!JSX_RETURN.test(source.slice(init.getStart(sf), init.getEnd()))) return null

	return decl.name.text
}

function isJsxReturningVariableStatement(
	stmt: ts.VariableStatement,
	sf: ts.SourceFile,
	source: string,
): boolean {
	return stmt.declarationList.declarations.some((decl) => jsxHelperName(decl, sf, source) !== null)
}

function collectPreambles(sf: ts.SourceFile, source: string): Preamble[] {
	const preambles: Preamble[] = []

	for (const stmt of sf.statements) {
		const index = stmt.getStart(sf)

		if (ts.isTypeAliasDeclaration(stmt)) {
			preambles.push({ names: [stmt.name.text], code: source.slice(index, stmt.getEnd()), index })

			continue
		}

		if (ts.isInterfaceDeclaration(stmt)) {
			preambles.push({ names: [stmt.name.text], code: source.slice(index, stmt.getEnd()), index })

			continue
		}

		if (ts.isVariableStatement(stmt)) {
			if (isDefaultExport(stmt.modifiers)) continue

			const code = source.slice(index, stmt.getEnd())

			// Skip statements that are themselves JSX-returning helpers — those
			// are collected by `collectHelpers` and would otherwise be pulled in
			// twice (once as preamble, once as helper).
			if (isJsxReturningVariableStatement(stmt, sf, source)) continue

			const names: string[] = []

			for (const decl of stmt.declarationList.declarations) {
				if (ts.isIdentifier(decl.name)) names.push(decl.name.text)
			}

			if (names.length === 0) continue

			preambles.push({ names, code, index })
		}
	}

	return preambles
}

/**
 * Prepend every preamble whose declared names appear (as whole-word matches)
 * in the helper's source. Matches are emitted in source order so the helper's
 * snippet reads top-to-bottom the way the author wrote it.
 *
 * This is a name scan, not a true reference graph — a preamble whose name
 * coincidentally appears inside a string literal or comment in the helper
 * will be pulled in. The false-positive cost (an extra type alias in the
 * code block) is small compared to the cost of a non-compilable snippet.
 */
function prependReferencedPreamble(helperCode: string, preambles: Preamble[]): string {
	const matched: Preamble[] = []
	const seen = new Set<number>()

	for (const preamble of preambles) {
		if (seen.has(preamble.index)) continue

		const referenced = preamble.names.some((name) => new RegExp(`\\b${name}\\b`).test(helperCode))

		if (!referenced) continue

		matched.push(preamble)
		seen.add(preamble.index)
	}

	if (matched.length === 0) return helperCode

	matched.sort((a, b) => a.index - b.index)

	return `${matched.map((p) => p.code).join('\n\n')}\n\n${helperCode}`
}

/**
 * Find every PascalCase top-level function/const that returns JSX. The default
 * export (the demo page itself) is skipped — it's rendered as the route body,
 * not inside `<Example>`, so a snippet for it is dead weight.
 *
 * Each helper's source is prepended with any sibling type alias, interface, or
 * `const` declaration it references by name, so the emitted snippet is
 * self-contained — copy-paste ready without dangling references to definitions
 * outside the helper body.
 */
export function collectHelpers(source: string): Helper[] {
	const sf = ts.createSourceFile(
		'demo.tsx',
		source,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TSX,
	)

	const preambles = collectPreambles(sf, source)

	const helpers: Helper[] = []

	for (const stmt of sf.statements) {
		if (ts.isFunctionDeclaration(stmt) && stmt.name && /^[A-Z]/.test(stmt.name.text) && stmt.body) {
			if (isDefaultExport(stmt.modifiers)) continue

			const code = source.slice(stmt.getStart(sf), stmt.getEnd())

			if (!JSX_RETURN.test(code)) continue

			helpers.push({ name: stmt.name.text, code: prependReferencedPreamble(code, preambles) })

			continue
		}

		if (ts.isVariableStatement(stmt)) {
			for (const decl of stmt.declarationList.declarations) {
				const name = jsxHelperName(decl, sf, source)

				if (!name) continue

				const code = source.slice(stmt.getStart(sf), stmt.getEnd())

				helpers.push({ name, code: prependReferencedPreamble(code, preambles) })
			}
		}
	}

	return helpers
}
