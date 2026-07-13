import ts from 'typescript'
import type { TypeShape } from './schema'

/** Nesting budget: fields nested deeper than this degrade to `opaque`. */
const MAX_DEPTH = 3

/** React content-type names that classify as `react-node` regardless of structure. */
const REACT_NODE_NAMES: ReadonlySet<string> = new Set(['ReactNode', 'ReactElement'])

/**
 * Classify a checker type into the bounded {@link TypeShape} structure the
 * usage engine consumes, so it never parses type strings at runtime.
 * `undefined` / `null` union members are stripped first; recursion is capped
 * at depth {@link MAX_DEPTH} and cycle-guarded by type id, degrading to
 * `opaque` past either limit.
 */
export function classifyType(type: ts.Type, checker: ts.TypeChecker): TypeShape {
	return classify(type, checker, 0, new Set())
}

function classify(
	type: ts.Type,
	checker: ts.TypeChecker,
	depth: number,
	seen: Set<number>,
): TypeShape {
	if (depth > MAX_DEPTH) return { k: 'opaque' }

	if (isReactNodeType(type)) return { k: 'react-node' }

	const id = typeId(type)

	if (seen.has(id)) return { k: 'opaque' }

	seen.add(id)

	try {
		return classifyGuarded(type, checker, depth, seen)
	} finally {
		seen.delete(id)
	}
}

function classifyGuarded(
	type: ts.Type,
	checker: ts.TypeChecker,
	depth: number,
	seen: Set<number>,
): TypeShape {
	if (type.isUnion()) {
		const members = type.types.filter(
			(t) => !(t.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Null)),
		)

		if (members.length === 0) return { k: 'opaque' }

		if (members.length === 1 && members[0]) return classify(members[0], checker, depth, seen)

		return classifyUnion(members, checker)
	}

	if (type.flags & ts.TypeFlags.Boolean) return { k: 'primitive', name: 'boolean' }

	if (type.flags & ts.TypeFlags.String) return { k: 'primitive', name: 'string' }

	if (type.flags & ts.TypeFlags.Number) return { k: 'primitive', name: 'number' }

	const literal = literalValue(type, checker)

	if (literal !== null) return { k: 'literal-union', members: [literal] }

	const signatures = type.getCallSignatures()

	if (signatures.length > 0 && signatures[0]) {
		return { k: 'fn', arity: signatureArity(signatures[0]) }
	}

	if (checker.isArrayType(type)) {
		const element = checker.getTypeArguments(type as ts.TypeReference)[0]

		if (!element) return { k: 'opaque' }

		return { k: 'array', element: classify(element, checker, depth + 1, seen) }
	}

	if (checker.isTupleType(type)) {
		const elements = checker.getTypeArguments(type as ts.TypeReference)

		return { k: 'tuple', elements: elements.map((el) => classify(el, checker, depth + 1, seen)) }
	}

	if (type.flags & ts.TypeFlags.Object) {
		const fields: Record<string, TypeShape> = {}

		for (const prop of type.getProperties()) {
			fields[prop.getName()] = classify(checker.getTypeOfSymbol(prop), checker, depth + 1, seen)
		}

		return { k: 'object', fields }
	}

	return { k: 'opaque' }
}

/**
 * A multi-member union of literals: the pure `true | false` pair reads back
 * as `boolean`; any other all-literal union keeps its member values. Unions
 * containing a non-literal member stay `opaque`.
 */
function classifyUnion(members: ts.Type[], checker: ts.TypeChecker): TypeShape {
	const values: (string | number | boolean)[] = []

	for (const member of members) {
		const value = literalValue(member, checker)

		if (value === null) return { k: 'opaque' }

		values.push(value)
	}

	if (values.length === 2 && values.every((v) => typeof v === 'boolean')) {
		return { k: 'primitive', name: 'boolean' }
	}

	return { k: 'literal-union', members: values }
}

/** The JS value of a string / number / boolean literal type; null for anything else. */
function literalValue(type: ts.Type, checker: ts.TypeChecker): string | number | boolean | null {
	if (type.flags & ts.TypeFlags.StringLiteral) return (type as ts.StringLiteralType).value

	if (type.flags & ts.TypeFlags.NumberLiteral) return (type as ts.NumberLiteralType).value

	if (type.flags & ts.TypeFlags.BooleanLiteral) return checker.typeToString(type) === 'true'

	return null
}

/** Minimum argument count of a signature: parameters before the first optional / defaulted / rest one. */
function signatureArity(signature: ts.Signature): number {
	let arity = 0

	for (const param of signature.getParameters()) {
		const decl = param.valueDeclaration

		if (decl && ts.isParameter(decl)) {
			if (decl.questionToken || decl.initializer || decl.dotDotDotToken) break
		}

		arity++
	}

	return arity
}

/**
 * Name-based React content detection: a type whose alias or symbol is named
 * `ReactNode` / `ReactElement`, or the JSX namespace's `Element`. Structural
 * detection would drag the whole ReactNode union through classification for
 * no gain — the usage engine only needs the "renderable content" signal.
 * Component classification shares it to recognize JSX-returning signatures.
 */
export function isReactNodeType(type: ts.Type): boolean {
	const aliasName = type.aliasSymbol?.getName()

	if (aliasName && REACT_NODE_NAMES.has(aliasName)) return true

	const symbol = type.getSymbol()

	if (!symbol) return false

	const name = symbol.getName()

	if (REACT_NODE_NAMES.has(name)) return true

	if (name !== 'Element') return false

	return (symbol.getDeclarations() ?? []).some(isInsideJsxNamespace)
}

/** Whether a declaration sits inside a `namespace JSX { … }` block. */
function isInsideJsxNamespace(decl: ts.Declaration): boolean {
	let current: ts.Node | undefined = decl.parent

	while (current) {
		if (ts.isModuleDeclaration(current) && current.name.getText() === 'JSX') return true

		current = current.parent
	}

	return false
}

/** Stable identity for the cycle guard; `id` is assigned to every checker type at creation. */
function typeId(type: ts.Type): number {
	return (type as ts.Type & { id: number }).id
}
