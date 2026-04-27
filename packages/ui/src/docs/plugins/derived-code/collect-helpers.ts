import ts from 'typescript'

export type Helper = { name: string; code: string }

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
 * Find every PascalCase top-level function/const that returns JSX. The default
 * export (the demo page itself) is skipped — it's rendered as the route body,
 * not inside `<Example>`, so a snippet for it is dead weight.
 */
export function collectHelpers(source: string): Helper[] {
	const sf = ts.createSourceFile(
		'demo.tsx',
		source,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TSX,
	)

	const helpers: Helper[] = []

	for (const stmt of sf.statements) {
		if (ts.isFunctionDeclaration(stmt) && stmt.name && /^[A-Z]/.test(stmt.name.text) && stmt.body) {
			if (isDefaultExport(stmt.modifiers)) continue

			const code = source.slice(stmt.getStart(sf), stmt.getEnd())

			if (!JSX_RETURN.test(code)) continue

			helpers.push({ name: stmt.name.text, code })

			continue
		}

		if (ts.isVariableStatement(stmt)) {
			for (const decl of stmt.declarationList.declarations) {
				if (!ts.isIdentifier(decl.name)) continue

				if (!/^[A-Z]/.test(decl.name.text)) continue

				const init = decl.initializer

				if (!init) continue

				if (!ts.isArrowFunction(init) && !ts.isFunctionExpression(init)) continue

				const code = source.slice(stmt.getStart(sf), stmt.getEnd())

				if (!JSX_RETURN.test(code)) continue

				helpers.push({ name: decl.name.text, code })
			}
		}
	}

	return helpers
}
