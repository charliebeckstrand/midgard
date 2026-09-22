import ts from 'typescript'
import type { ImportFact } from '../derive-code/types'
import { isPascalCase, wordRe } from '../identifiers'
import { parseSource } from './ts-source'

/**
 * One helper component and its snippet. `code` is the helper's source, led by
 * every sibling declaration it depends on. `imports` holds each imported name
 * that `code` uses, keyed to where a reader imports it from.
 */
type Helper = { name: string; code: string; imports: Record<string, ImportFact> }

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
 * A top-level statement a helper can depend on. `names` lists the identifiers
 * it introduces; `code` is the full statement source for verbatim prepending.
 */
type Declaration = { stmt: ts.Statement; names: string[]; code: string }

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
 * to these. {@link isJsxHelperStatement} keeps them out of the source-facts
 * declaration table, because a fact copy would duplicate a component that the
 * walker already renders from its snippet. Were the two to read different
 * rules, a helper would come out with a snippet and a fact copy, or with
 * neither.
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

/** The identifiers a binding introduces, through any destructuring pattern. */
function bindingNames(name: ts.BindingName): string[] {
	if (ts.isIdentifier(name)) return [name.text]

	return name.elements.flatMap((element) =>
		ts.isOmittedExpression(element) ? [] : bindingNames(element.name),
	)
}

/** The names a top-level statement declares. Empty for an import or an expression. */
export function declaredNames(stmt: ts.Statement): string[] {
	if (
		ts.isTypeAliasDeclaration(stmt) ||
		ts.isInterfaceDeclaration(stmt) ||
		ts.isEnumDeclaration(stmt)
	) {
		return [stmt.name.text]
	}

	if (ts.isFunctionDeclaration(stmt) || ts.isClassDeclaration(stmt)) {
		return stmt.name ? [stmt.name.text] : []
	}

	if (ts.isVariableStatement(stmt)) {
		return stmt.declarationList.declarations.flatMap((decl) => bindingNames(decl.name))
	}

	return []
}

/**
 * Every top-level statement a helper can depend on, in source order. The demo
 * page itself stays out: the entry export and a default export render as the
 * route body, which no snippet shows.
 */
function collectDeclarations(sf: ts.SourceFile): Declaration[] {
	return sf.statements.flatMap((stmt) => {
		const names = declaredNames(stmt)

		if (names.length === 0 || names.includes(ENTRY_EXPORT) || isDefaultExported(stmt)) return []

		return [{ stmt, names, code: stmt.getText(sf) }]
	})
}

/**
 * The helper's source, led by every declaration it depends on. A declaration
 * joins when one of its names appears in the text gathered so far, so the
 * declarations that a joined one uses join too, until none is left. They keep
 * their source order, and the helper comes last. Another helper joins like any
 * declaration: the walker shows this snippet in place of the tree it renders,
 * so nothing renders the other helper a second time.
 *
 * @remarks
 * This is a name scan, not a reference graph. A name that appears inside a
 * string literal or a comment pulls its declaration in, which errs toward a
 * longer snippet and never toward a broken one.
 */
function closeOver(helper: ts.Statement, declarations: Declaration[], sf: ts.SourceFile): string {
	const joined = new Set<Declaration>()

	const texts = [helper.getText(sf)]

	let grew = true

	while (grew) {
		grew = false

		for (const declaration of declarations) {
			if (declaration.stmt === helper || joined.has(declaration)) continue

			const used = declaration.names.some((name) => {
				const re = wordRe(name)

				return texts.some((text) => re.test(text))
			})

			if (!used) continue

			joined.add(declaration)

			texts.push(declaration.code)

			grew = true
		}
	}

	return [
		...declarations.filter((declaration) => joined.has(declaration)).map(({ code }) => code),
		helper.getText(sf),
	].join('\n\n')
}

/** The entries of `imports` whose name `code` uses, as a whole word. */
function usedImports(
	code: string,
	imports: Record<string, ImportFact>,
): Record<string, ImportFact> {
	return Object.fromEntries(Object.entries(imports).filter(([name]) => wordRe(name).test(code)))
}

/**
 * Finds every PascalCase top-level function or const that returns JSX. It skips
 * the entry export `Demo`, the demo page itself. That renders as the route body
 * and never inside `<Example>`, so attaching its source only bloats the chunk
 * with a `__code` string nothing reads.
 *
 * Each helper's snippet carries every sibling declaration it depends on,
 * through any chain of them (see {@link closeOver}). It also carries the
 * entries of `imports` that the snippet uses. A name imported from a module no
 * reader can import, such as the docs engine or a sibling demo file, has no
 * entry in `imports`, so the snippet stays short of that one name.
 *
 * @param imports - The demo's import table, from `importFacts`.
 */
export function collectHelpers(
	source: string,
	sourceFile?: ts.SourceFile,
	imports: Record<string, ImportFact> = {},
): Helper[] {
	const sf = sourceFile ?? parseSource('demo.tsx', source)

	const declarations = collectDeclarations(sf)

	const helpers: Helper[] = []

	for (const stmt of sf.statements) {
		if (isDefaultExported(stmt)) continue

		for (const name of helperNames(stmt)) {
			if (name === ENTRY_EXPORT) continue

			const code = closeOver(stmt, declarations, sf)

			helpers.push({ name, code, imports: usedImports(code, imports) })
		}
	}

	return helpers
}
