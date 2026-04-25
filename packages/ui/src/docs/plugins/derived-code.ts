import path from 'node:path'
import ts from 'typescript'
import type { Plugin } from 'vite'

type Helper = { name: string; code: string }

function returnsJsx(body: ts.Block): boolean {
	const found = { value: false }

	function visit(node: ts.Node): void {
		if (found.value) return

		if (ts.isReturnStatement(node) && node.expression) {
			let expr: ts.Expression = node.expression

			if (ts.isParenthesizedExpression(expr)) expr = expr.expression

			if (ts.isJsxElement(expr) || ts.isJsxFragment(expr) || ts.isJsxSelfClosingElement(expr)) {
				found.value = true

				return
			}
		}

		// Don't descend into nested function scopes — their returns aren't ours.
		if (
			ts.isFunctionDeclaration(node) ||
			ts.isFunctionExpression(node) ||
			ts.isArrowFunction(node) ||
			ts.isMethodDeclaration(node)
		) {
			return
		}

		ts.forEachChild(node, visit)
	}

	visit(body)

	return found.value
}

function arrowReturnsJsx(init: ts.ArrowFunction): boolean {
	if (ts.isBlock(init.body)) return returnsJsx(init.body)

	let expr: ts.Expression = init.body

	if (ts.isParenthesizedExpression(expr)) expr = expr.expression

	return ts.isJsxElement(expr) || ts.isJsxFragment(expr) || ts.isJsxSelfClosingElement(expr)
}

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
			// Skip the demo page itself (default export) — it's rendered as the
			// route body, not inside `<Example>`, so a snippet for it is dead weight.
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

/**
 * Vite plugin that extracts each demo helper component's full source at
 * build time and attaches it as a `__code` static property on the component.
 *
 * The docs code-derivation walker reads `__code` at render time so that
 * `<Example><MyHelperDemo /></Example>` produces a snippet showing the
 * helper's hooks, state setup, and JSX — not just a `<MyHelperDemo />` tag,
 * and without invoking the component at derive-time (which would trigger
 * React's rules-of-hooks warning when hooks run inside `useMemo`).
 *
 * Scope is limited to `demos/*.tsx` so the transform has no reach into
 * library components or unrelated docs modules.
 */
export function derivedCodePlugin(): Plugin {
	let demosDir: string

	return {
		name: 'derived-code',

		enforce: 'pre',

		configResolved(config) {
			demosDir = path.resolve(config.root, 'demos')
		},

		transform(code, id) {
			const cleanId = id.split('?')[0]

			if (!cleanId.startsWith(demosDir + path.sep)) return

			if (!cleanId.endsWith('.tsx')) return

			const helpers = collectHelpers(code)

			if (helpers.length === 0) return

			const tail = helpers
				.map(
					({ name, code }) =>
						`;(${name} as unknown as { __code?: string }).__code = ${JSON.stringify(code)};`,
				)
				.join('\n')

			return { code: `${code}\n\n${tail}\n`, map: null }
		},
	}
}
