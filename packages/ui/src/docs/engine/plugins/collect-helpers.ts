import ts from 'typescript'
import { isPascalCase, wordRe } from '../identifiers'
import { parseSource } from './ts-source'

type Helper = { name: string; code: string }

// The demo page's entry export, loaded via `import.meta.glob(…, { import: 'Demo'
// })`. It renders as the route body, never inside an `<Example>`, so its
// `__code` is never read — skip it rather than shipping the whole page source.
const ENTRY_EXPORT = 'Demo'

/**
 * Whether an expression evaluates to rendered JSX: an element or a fragment, a
 * conditional or logical choice that yields one, or an array of them. A call
 * counts when it receives an element or a callback that renders one, as in
 * `items.map((i) => <Option />)` and `createPortal(<Panel />, node)`.
 *
 * @remarks
 * A function or an object that holds JSX is not rendered JSX. A render-prop
 * factory returns the first, and a column list returns the second, and neither
 * is a component.
 */
function isRenderedJsx(node: ts.Expression): boolean {
	if (
		ts.isParenthesizedExpression(node) ||
		ts.isAsExpression(node) ||
		ts.isSatisfiesExpression(node) ||
		ts.isNonNullExpression(node)
	) {
		return isRenderedJsx(node.expression)
	}

	if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) {
		return true
	}

	if (ts.isConditionalExpression(node)) {
		return isRenderedJsx(node.whenTrue) || isRenderedJsx(node.whenFalse)
	}

	if (ts.isBinaryExpression(node)) {
		const operator = node.operatorToken.kind

		const chooses =
			operator === ts.SyntaxKind.AmpersandAmpersandToken ||
			operator === ts.SyntaxKind.BarBarToken ||
			operator === ts.SyntaxKind.QuestionQuestionToken

		return chooses && (isRenderedJsx(node.left) || isRenderedJsx(node.right))
	}

	if (ts.isArrayLiteralExpression(node)) {
		return node.elements.some((element) =>
			isRenderedJsx(ts.isSpreadElement(element) ? element.expression : element),
		)
	}

	if (ts.isCallExpression(node)) {
		return node.arguments.some(
			(arg) =>
				isRenderedJsx(arg) ||
				((ts.isArrowFunction(arg) || ts.isFunctionExpression(arg)) && rendersJsx(arg)),
		)
	}

	return false
}

/**
 * Whether a statement subtree holds a `return` of rendered JSX. A nested
 * function's returns are its own, so the walk stops at one. The returned
 * expression goes to {@link isRenderedJsx}.
 */
function returnsJsx(node: ts.Node): boolean {
	if (ts.isFunctionLike(node)) return false

	if (ts.isReturnStatement(node)) {
		return node.expression !== undefined && isRenderedJsx(node.expression)
	}

	// `forEachChild` yields the first truthy result its visitor returns, and
	// `undefined` once every child answers false.
	return node.forEachChild(returnsJsx) ?? false
}

/**
 * Whether a function renders JSX, which is the test for a component. An arrow's
 * concise body is itself the returned expression; a block body goes to
 * {@link returnsJsx}.
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

	return ts.isBlock(body) ? returnsJsx(body) : isRenderedJsx(body)
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
 */
function jsxHelperName(decl: ts.VariableDeclaration): string | null {
	if (!ts.isIdentifier(decl.name)) return null

	if (!isPascalCase(decl.name.text)) return null

	const init = decl.initializer

	if (!init) return null

	if (!ts.isArrowFunction(init) && !ts.isFunctionExpression(init)) return null

	return rendersJsx(init) ? decl.name.text : null
}

/**
 * The helper components a top-level statement declares: a PascalCase function
 * declaration or arrow/function-expression declarator whose body renders JSX.
 * Empty for anything else.
 *
 * @remarks
 * The one answer both readers take. {@link collectHelpers} attaches `__code`
 * to these. {@link isJsxHelperStatement} keeps them out of declaration
 * preambles, because pulling one into a snippet would duplicate a component
 * the walker already renders. Were the two to read different rules, a helper
 * would come out with a snippet and a preamble copy, or with neither.
 */
function helperNames(stmt: ts.Statement): string[] {
	if (ts.isFunctionDeclaration(stmt)) {
		const name = stmt.name?.text

		if (!name || !isPascalCase(name) || !stmt.body) return []

		return rendersJsx(stmt) ? [name] : []
	}

	if (!ts.isVariableStatement(stmt)) return []

	return stmt.declarationList.declarations.flatMap((decl) => {
		const name = jsxHelperName(decl)

		return name === null ? [] : [name]
	})
}

/** Whether a top-level statement declares a helper component. */
export function isJsxHelperStatement(stmt: ts.Statement): boolean {
	return helperNames(stmt).length > 0
}

/**
 * Whether the statement is `export default`. Only a function declaration takes
 * the modifier; a variable statement never does.
 */
function isDefaultExported(stmt: ts.Statement): boolean {
	if (!ts.isFunctionDeclaration(stmt)) return false

	// `ExportDefault` is the `Export | Default` pair, so the test is an equality
	// against both bits: a plain `export function` sets only one.
	const flags = ts.getCombinedModifierFlags(stmt)

	return (flags & ts.ModifierFlags.ExportDefault) === ts.ModifierFlags.ExportDefault
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
			if (isJsxHelperStatement(stmt)) continue

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
		if (isDefaultExported(stmt)) continue

		for (const name of helperNames(stmt)) {
			if (name === ENTRY_EXPORT) continue

			helpers.push({ name, code: prependReferencedPreamble(stmt.getText(sf), preambles) })
		}
	}

	return helpers
}
