import { ts } from 'ts-morph'

const TYPE_FORMAT_FLAGS =
	ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope

/**
 * Format a TypeScript Type as a short, display-friendly string. Uses type
 * aliases when available so we get `BoxPadding` instead of the inlined union,
 * and avoids truncation of large unions.
 *
 * Special-cases:
 *   - If the type has an `aliasSymbol` (a named alias like `ReactNode`), use
 *     the alias name directly to avoid expanding it to its underlying union.
 *   - If the type is an interface or class instance (e.g. `ReactElement`),
 *     use the declaration's name — TS otherwise renders it with its own
 *     type-parameter defaults filled in (`ReactElement<unknown, …>`).
 *   - For a generic type parameter (`T`), fall back to its default or
 *     constraint when declared so e.g. `Filters<T extends FilterValue>` shows
 *     `FilterValue` instead of a bare `T` that means nothing in isolation.
 *   - Render string-literal members with single quotes.
 *
 * Operates on raw compiler types (not ts-morph wrappers) because the recursion
 * needs to format types returned by `getDefaultFromTypeParameter` /
 * `getBaseConstraintOfType`, which ts-morph doesn't surface as wrapped Types.
 */
export function formatType(type: ts.Type, checker: ts.TypeChecker, location?: ts.Node): string {
	const named = namedTypeShortName(type, checker, location)

	if (named) return named

	const generic = typeParameterFallback(type, checker, location)

	if (generic) return generic

	const fn = formatFunctionType(type, checker, location)

	if (fn) return fn

	return toSingleQuotes(checker.typeToString(type, location, TYPE_FORMAT_FLAGS))
}

/**
 * Format a prop's type. Same as `formatType` but strips `| undefined` from
 * optional unions so the rendered surface doesn't carry redundant noise on
 * every optional prop.
 */
export function formatPropType(type: ts.Type, checker: ts.TypeChecker, location?: ts.Node): string {
	const named = namedTypeShortName(type, checker, location)

	if (named) return named

	const generic = typeParameterFallback(type, checker, location)

	if (generic) return generic

	if (type.isUnion()) {
		const filtered = type.types.filter((t) => !(t.flags & ts.TypeFlags.Undefined))

		if (filtered.length !== type.types.length) {
			if (filtered.length === 1 && filtered[0]) return formatType(filtered[0], checker, location)

			return filtered.map((t) => formatType(t, checker, location)).join(' | ')
		}
	}

	return toSingleQuotes(checker.typeToString(type, location, TYPE_FORMAT_FLAGS))
}

/**
 * Return the short name of a type whose identity is a named declaration
 * (alias / interface / class) rather than a structural shape.
 *
 * When the type carries no type arguments — or all of its trailing type
 * arguments match their declared defaults — the bare name is preferred:
 * `ReactElement` instead of TS's expanded `ReactElement<unknown, …>`.
 */
function namedTypeShortName(
	type: ts.Type,
	checker: ts.TypeChecker,
	location: ts.Node | undefined,
): string | null {
	const aliasName = type.aliasSymbol?.getName()

	if (aliasName) {
		const aliasParams = type.aliasSymbol
			?.getDeclarations()
			?.find(ts.isTypeAliasDeclaration)?.typeParameters

		const trimmed = trimDefaultArgs(type.aliasTypeArguments, aliasParams, checker, location)

		if (trimmed === null) return null

		return formatNameWithArgs(aliasName, trimmed, checker, location)
	}

	const symbol = type.getSymbol()

	if (!symbol) return null

	const declarations = symbol.getDeclarations() ?? []

	const namedDecl = declarations.find(
		(d): d is ts.InterfaceDeclaration | ts.ClassDeclaration =>
			ts.isInterfaceDeclaration(d) || ts.isClassDeclaration(d),
	)

	if (!namedDecl) return null

	const args = isTypeReference(type) ? checker.getTypeArguments(type) : undefined

	const trimmed = trimDefaultArgs(args, namedDecl.typeParameters, checker, location)

	if (trimmed === null) return null

	return formatNameWithArgs(symbol.getName(), trimmed, checker, location)
}

/**
 * Strip trailing arguments that match their parameter's declared default —
 * what's left is what the source actually wrote. Returns `null` to signal
 * "give up; let TS render the full thing" (mismatched arity, missing defaults
 * mid-list, …).
 *
 * A default expression may reference an earlier type parameter (`type Foo<T,
 * U = T>`); we resolve those against the supplied arg at the earlier position
 * rather than letting them collapse to the bare unbound parameter.
 */
function trimDefaultArgs(
	args: readonly ts.Type[] | undefined,
	params: readonly ts.TypeParameterDeclaration[] | undefined,
	checker: ts.TypeChecker,
	location: ts.Node | undefined,
): readonly ts.Type[] | null {
	if (!args || args.length === 0) return []

	if (!params || params.length < args.length) return args

	const argStrings = args.map((a) => checker.typeToString(a, location, TYPE_FORMAT_FLAGS))

	let len = args.length

	while (len > 0) {
		const arg = args[len - 1]
		const param = params[len - 1]

		if (!arg || !param || !param.default) break

		const defaultText = param.default.getText().trim()

		const earlierIndex = params.findIndex((p, i) => i < len - 1 && p.name.text === defaultText)

		const expected =
			earlierIndex >= 0
				? argStrings[earlierIndex]
				: checker.typeToString(
						checker.getTypeFromTypeNode(param.default),
						location,
						TYPE_FORMAT_FLAGS,
					)

		if (argStrings[len - 1] !== expected) break

		len--
	}

	return args.slice(0, len)
}

function formatNameWithArgs(
	name: string,
	args: readonly ts.Type[],
	checker: ts.TypeChecker,
	location: ts.Node | undefined,
): string {
	if (args.length === 0) return name

	return `${name}<${args.map((a) => formatType(a, checker, location)).join(', ')}>`
}

/**
 * Format a single-call-signature function type by recursing into each
 * parameter type and the return type — so nested type parameters (`T` inside
 * `(value: T) => void`) hit the same fallback as top-level types and resolve
 * to their constraint/default. Only single-call-signature types qualify;
 * overloads / hybrid types are left to TS's default rendering.
 */
function formatFunctionType(
	type: ts.Type,
	checker: ts.TypeChecker,
	location: ts.Node | undefined,
): string | null {
	const signatures = type.getCallSignatures()

	if (signatures.length !== 1) return null

	if (type.getProperties().length > 0) return null

	const sig = signatures[0]

	if (!sig) return null

	const params = sig.getParameters().map((p) => {
		const decl = p.valueDeclaration ?? location

		const paramType = decl
			? checker.getTypeOfSymbolAtLocation(p, decl)
			: checker.getDeclaredTypeOfSymbol(p)

		return `${p.getName()}: ${formatType(paramType, checker, location)}`
	})

	const ret = formatType(sig.getReturnType(), checker, location)

	return `(${params.join(', ')}) => ${ret}`
}

/**
 * For a generic type parameter (`T`) prefer its default, then its constraint —
 * a bare parameter name like `T` is meaningless without the surrounding
 * generic context, but the default/constraint is what callers actually pass.
 * Returns null when the type is not a parameter, or the parameter has neither
 * default nor constraint (in which case showing `T` is the most honest output).
 */
function typeParameterFallback(
	type: ts.Type,
	checker: ts.TypeChecker,
	location: ts.Node | undefined,
): string | null {
	if (!(type.flags & ts.TypeFlags.TypeParameter)) return null

	const param = type as ts.TypeParameter

	const fallback =
		checker.getDefaultFromTypeParameter(param) ?? checker.getBaseConstraintOfType(param)

	if (!fallback) return null

	return formatType(fallback, checker, location)
}

/** Convert TS double-quoted string literals to single quotes. */
function toSingleQuotes(s: string): string {
	return s.replace(/"([^"\\]*)"/g, "'$1'")
}

/**
 * Narrow a Type to a type reference — an object type whose identity is a
 * generic instantiation. `getTypeArguments()` is only meaningful on these.
 */
function isTypeReference(type: ts.Type): type is ts.TypeReference {
	if (!(type.flags & ts.TypeFlags.Object)) return false

	return ((type as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference) !== 0
}
