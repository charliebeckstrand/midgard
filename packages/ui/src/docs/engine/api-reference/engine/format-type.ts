import { ts } from 'ts-morph'

const TYPE_FORMAT_FLAGS =
	ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope

/**
 * Format a `ts.Type` as a short, display-friendly string. Prefers named
 * aliases over expanded unions, and renders large unions in full rather than
 * truncating.
 *
 *   - Named alias (`ReactNode`, `BoxPadding`): use the alias name directly.
 *   - Interface or class instance (`ReactElement`): use the declaration's
 *     name; TS otherwise fills in type-parameter defaults
 *     (`ReactElement<unknown, …>`).
 *   - Generic type parameter: fall back to its default or constraint;
 *     `Filters<T extends FilterValue>` shows `FilterValue`, not a bare `T`.
 *   - String-literal members render with single quotes.
 *
 * Works on raw compiler types (not ts-morph wrappers); recursion formats
 * types returned by `getDefaultFromTypeParameter` / `getBaseConstraintOfType`,
 * which ts-morph doesn't surface as wrapped Types.
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
 * Same as `formatType`, but strips `| undefined` from optional unions.
 */
export function formatPropType(type: ts.Type, checker: ts.TypeChecker, location?: ts.Node): string {
	const named = namedTypeShortName(type, checker, location)

	if (named) return named

	const generic = typeParameterFallback(type, checker, location)

	if (generic) return generic

	if (type.isUnion()) {
		const filtered = type.types.filter((t) => !(t.flags & ts.TypeFlags.Undefined))

		// `'literal' | (string & {})` escape hatch: the union accepts any string,
		// so its literals are editor hints, not a constraint. React's
		// `HTMLInputAutoCompleteAttribute` is the canonical case — render `string`
		// instead of expanding every DOM autofill token.
		if (filtered.some(isStringEscapeHatch)) return 'string'

		if (filtered.length !== type.types.length) {
			if (filtered.length === 1 && filtered[0]) return formatType(filtered[0], checker, location)

			return formatUnionMembers(filtered, checker, location)
		}
	}

	return toSingleQuotes(checker.typeToString(type, location, TYPE_FORMAT_FLAGS))
}

/**
 * Join union members with `|`, re-collapsing the `false | true` pair back into
 * `boolean`. TS models `boolean` as that literal pair inside a union's members,
 * so formatting each member individually — the path optional unions take after
 * stripping `| undefined` — would otherwise disintegrate `boolean` into `false |
 * true`. Two boolean-literal members are always exactly `false` and `true` (a
 * union can't repeat either), so a count of two means `boolean`; a single one is
 * a genuine literal (`foo?: true`) and renders as written.
 */
function formatUnionMembers(
	members: readonly ts.Type[],
	checker: ts.TypeChecker,
	location: ts.Node | undefined,
): string {
	const collapseBoolean = members.filter((t) => t.flags & ts.TypeFlags.BooleanLiteral).length === 2

	const parts: string[] = []

	let booleanEmitted = false

	for (const member of members) {
		if (collapseBoolean && member.flags & ts.TypeFlags.BooleanLiteral) {
			if (!booleanEmitted) {
				parts.push('boolean')

				booleanEmitted = true
			}

			continue
		}

		parts.push(formatType(member, checker, location))
	}

	return parts.join(' | ')
}

/**
 * Short name for a type whose identity is a named declaration (alias /
 * interface / class). Trims trailing type arguments that match their
 * declared defaults; `ReactElement` renders instead of
 * `ReactElement<unknown, …>`.
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

	// Array / readonly-array types render `T[]` / `readonly T[]` rather than
	// `Array<T>` / `ReadonlyArray<T>` — `PropDef.type` documents types as written
	// in source. A union or function element is parenthesized so `(string |
	// number)[]` doesn't read as `string | (number[])`.
	if (checker.isArrayType(type)) {
		const element = checker.getTypeArguments(type as ts.TypeReference)[0]

		if (!element) return null

		const readonly = type.getSymbol()?.getName() === 'ReadonlyArray' ? 'readonly ' : ''

		return `${readonly}${formatArrayElement(element, checker, location)}[]`
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
 * Drops trailing arguments that match their parameter's declared default,
 * returning the minimal arg list. Returns `null` on mismatched arity or
 * missing defaults mid-list; the caller falls back to TS's full rendering.
 *
 * Defaults that reference an earlier type parameter (`type Foo<T, U = T>`)
 * resolve against the supplied arg at that earlier position.
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

		if (!arg || !param?.default) break

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

/** Render an array's element type, parenthesizing a union / intersection / function so `[]` binds correctly. */
function formatArrayElement(
	element: ts.Type,
	checker: ts.TypeChecker,
	location: ts.Node | undefined,
): string {
	const rendered = formatType(element, checker, location)

	const needsParens =
		element.isUnion() || element.isIntersection() || element.getCallSignatures().length > 0

	return needsParens ? `(${rendered})` : rendered
}

/**
 * Format a single-call-signature function type by recursing into each
 * parameter and the return type; nested type parameters (`T` inside
 * `(value: T) => void`) hit the same default / constraint fallback as
 * top-level types. Overloads and hybrid types defer to TS's default.
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
 * For a generic type parameter, return its default or (falling back) its
 * constraint. Returns null when the type isn't a parameter, or when neither
 * default nor constraint exists (leaving the bare `T` as output).
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

/** TS emits double quotes; the rest of the docs use single. */
function toSingleQuotes(s: string): string {
	return s.replace(/"([^"\\]*)"/g, "'$1'")
}

/**
 * Detects the `string & {}` member of a "string literal with autocomplete"
 * union: an intersection of the `string` primitive with an empty object type.
 * The empty-object brand keeps TS from widening the union to `string`, but for
 * display the whole union is just `string`. A branded string (`string & { … }`
 * with members) is a real distinct type and does not match.
 */
function isStringEscapeHatch(type: ts.Type): boolean {
	if (!(type.flags & ts.TypeFlags.Intersection)) return false

	const parts = (type as ts.IntersectionType).types

	const hasString = parts.some((p) => (p.flags & ts.TypeFlags.String) !== 0)

	const hasEmptyObject = parts.some(
		(p) => (p.flags & ts.TypeFlags.Object) !== 0 && p.getProperties().length === 0,
	)

	return hasString && hasEmptyObject
}

/**
 * Narrow to a type reference: an object type whose identity is a generic
 * instantiation. `getTypeArguments()` is only meaningful on these.
 */
function isTypeReference(type: ts.Type): type is ts.TypeReference {
	if (!(type.flags & ts.TypeFlags.Object)) return false

	return ((type as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference) !== 0
}
