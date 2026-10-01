import { ts } from 'ts-morph'
import {
	aliasTarget,
	type Bindings,
	NO_BINDINGS,
	resolveBound,
	typeRefName,
	unaliasSymbol,
} from './ts-utils'

/**
 * Collect the defaults of each recipe that a props annotation reads through
 * `VariantProps<typeof k>`: the `defaults` of the `defineRecipe` config of `k`.
 * `ButtonVariants = VariantProps<typeof k>` with `defaults: { variant: 'solid' }`
 * gives `{ variant: "'solid'" }`. Values keep their source quoting.
 *
 * @remarks
 * The recipe applies these values when the prop is unset, so they are the
 * defaults that the reader sees. A default that the component destructures, or
 * that a `@defaultValue` tag gives, comes first: the caller only fills in.
 *
 * Only a recipe that the body of `callable` names counts. A wrapper that takes
 * the props of another component, such as `PaginationNext` over `Button`, can
 * set its own values, so the recipe of the inner component says nothing about
 * the wrapper.
 */
export function extractRecipeDefaults(
	annotation: ts.TypeNode,
	callable: ts.Node,
	checker: ts.TypeChecker,
): Map<string, string> {
	const defaults = new Map<string, string>()

	const own = namedSymbols(callable, checker)

	walk(annotation, NO_BINDINGS, { defaults, own }, new Set(), checker)

	return defaults
}

/** The symbols that the identifiers of a node name, past import aliases. */
function namedSymbols(node: ts.Node, checker: ts.TypeChecker): Set<ts.Symbol> {
	const symbols = new Set<ts.Symbol>()

	const visit = (child: ts.Node) => {
		if (ts.isIdentifier(child)) {
			const symbol = checker.getSymbolAtLocation(child)

			if (symbol) symbols.add(recipeSymbol(symbol, checker))
		}

		ts.forEachChild(child, visit)
	}

	visit(node)

	return symbols
}

/**
 * A symbol past its import alias and past a shorthand property. A slot recipe
 * such as `k.delta` names the property of `{ delta }`, and the recipe is the
 * `const delta` that the shorthand reads.
 */
function recipeSymbol(symbol: ts.Symbol, checker: ts.TypeChecker): ts.Symbol {
	const unaliased = unaliasSymbol(symbol, checker)

	const declaration = unaliased.valueDeclaration

	if (declaration && ts.isShorthandPropertyAssignment(declaration)) {
		const value = checker.getShorthandAssignmentValueSymbol(declaration)

		if (value) return unaliasSymbol(value, checker)
	}

	return unaliased
}

/** The defaults that the walk collects, and the symbols that the component names. */
type Found = { defaults: Map<string, string>; own: ReadonlySet<ts.Symbol> }

function walk(
	annotation: ts.TypeNode,
	scope: Bindings,
	found: Found,
	seen: Set<ts.Node>,
	checker: ts.TypeChecker,
): void {
	const { node, bindings } = resolveBound(annotation, scope, checker)

	if (seen.has(node)) return

	seen.add(node)

	const recurse = (next: ts.TypeNode, nextBindings = bindings) =>
		walk(next, nextBindings, found, seen, checker)

	if (ts.isIntersectionTypeNode(node) || ts.isUnionTypeNode(node)) {
		for (const member of node.types) recurse(member)

		return
	}

	if (ts.isParenthesizedTypeNode(node)) {
		recurse(node.type)

		return
	}

	if (!ts.isTypeReferenceNode(node)) return

	const [first] = node.typeArguments ?? []

	if (typeRefName(node.typeName) === 'VariantProps') {
		if (first && ts.isTypeQueryNode(first)) readRecipe(first.exprName, found, checker)

		return
	}

	// A project alias, such as `ButtonVariants`: read its right-hand side. An
	// alias of a declaration file, such as `Omit`, is a utility type.
	const target = aliasTarget(node, bindings, checker)

	if (target && !target.node.getSourceFile().isDeclarationFile) {
		recurse(target.node, target.bindings)

		return
	}

	// A utility type, such as `Omit<ButtonVariants, 'color'>`: read its first
	// argument. The prop table drops an omitted key, so its default is not read.
	if (first) recurse(first)
}

/** Read the `defaults` of the `defineRecipe` call that `name` resolves to. */
function readRecipe(name: ts.EntityName, { defaults, own }: Found, checker: ts.TypeChecker): void {
	const found = checker.getSymbolAtLocation(ts.isIdentifier(name) ? name : name.right)

	const symbol = found && recipeSymbol(found, checker)

	if (!symbol || !own.has(symbol)) return

	const declaration = symbol.valueDeclaration

	if (!declaration || !ts.isVariableDeclaration(declaration)) return

	const call = declaration.initializer

	if (!call || !ts.isCallExpression(call) || call.expression.getText() !== 'defineRecipe') return

	const [config] = call.arguments

	if (!config || !ts.isObjectLiteralExpression(config)) return

	const property = config.properties.find(
		(p): p is ts.PropertyAssignment =>
			ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === 'defaults',
	)

	if (!property || !ts.isObjectLiteralExpression(property.initializer)) return

	for (const entry of property.initializer.properties) {
		if (!ts.isPropertyAssignment(entry)) continue

		const key =
			ts.isIdentifier(entry.name) || ts.isStringLiteral(entry.name) ? entry.name.text : null

		if (key && !defaults.has(key) && isPrimitiveLiteral(entry.initializer)) {
			defaults.set(key, entry.initializer.getText())
		}
	}
}

/** Whether an expression is a string, number, or boolean literal. */
function isPrimitiveLiteral(node: ts.Expression): boolean {
	return (
		ts.isStringLiteralLike(node) ||
		ts.isNumericLiteral(node) ||
		node.kind === ts.SyntaxKind.TrueKeyword ||
		node.kind === ts.SyntaxKind.FalseKeyword
	)
}
