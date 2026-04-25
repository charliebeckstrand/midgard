import ts from 'typescript'
import { arrowReturnsJsx, returnsJsx } from './jsx-detect'

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

			if (!returnsJsx(stmt.body)) continue

			helpers.push({ name: stmt.name.text, code: source.slice(stmt.getStart(sf), stmt.getEnd()) })

			continue
		}

		if (ts.isVariableStatement(stmt)) {
			for (const decl of stmt.declarationList.declarations) {
				if (!ts.isIdentifier(decl.name)) continue

				if (!/^[A-Z]/.test(decl.name.text)) continue

				const init = decl.initializer

				if (!init) continue

				let returns = false

				if (ts.isArrowFunction(init)) returns = arrowReturnsJsx(init)
				else if (ts.isFunctionExpression(init) && init.body) returns = returnsJsx(init.body)

				if (!returns) continue

				helpers.push({ name: decl.name.text, code: source.slice(stmt.getStart(sf), stmt.getEnd()) })
			}
		}
	}

	return helpers
}
