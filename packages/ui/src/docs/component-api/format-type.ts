import ts from 'typescript'

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
 *   - Render string-literal members with single quotes to match v1's output.
 */
export function formatType(type: ts.Type, checker: ts.TypeChecker, location?: ts.Node): string {
	const named = namedTypeShortName(type)

	if (named) return named

	const raw = checker.typeToString(type, location, TYPE_FORMAT_FLAGS)

	return toSingleQuotes(raw)
}

/**
 * Return the short name of a type whose identity is a named declaration
 * (alias / interface / class) rather than a structural shape. For aliases,
 * `aliasSymbol` carries the name. For interfaces and classes the alias
 * machinery doesn't apply, but the type's own symbol is the declaration —
 * so we use that name to avoid TS expanding the form with default type args.
 */
function namedTypeShortName(type: ts.Type): string | null {
	const aliased = type.aliasSymbol?.getName()

	if (aliased) return aliased

	const symbol = type.getSymbol()

	if (!symbol) return null

	const isInterfaceOrClass = symbol
		.getDeclarations()
		?.some((d) => ts.isInterfaceDeclaration(d) || ts.isClassDeclaration(d))

	return isInterfaceOrClass ? symbol.getName() : null
}

/**
 * Format a property's type, stripping `| undefined` from optional unions so
 * the rendered surface doesn't carry redundant noise on every optional prop.
 */
export function formatPropType(type: ts.Type, checker: ts.TypeChecker, location?: ts.Node): string {
	// Preserve named aliases / interfaces (e.g. `ReactNode | undefined` →
	// `ReactNode`, `ReactElement<…> | undefined` → `ReactElement`).
	const named = namedTypeShortName(type)

	if (named) return named

	if (type.isUnion()) {
		const filtered = type.types.filter((t) => !(t.flags & ts.TypeFlags.Undefined))

		if (filtered.length !== type.types.length) {
			if (filtered.length === 1 && filtered[0]) return formatType(filtered[0], checker, location)

			return filtered.map((t) => formatType(t, checker, location)).join(' | ')
		}
	}

	const raw = checker.typeToString(type, location, TYPE_FORMAT_FLAGS)

	return toSingleQuotes(raw)
}

/** Convert TS double-quoted string literals to single quotes for parity with v1. */
function toSingleQuotes(s: string): string {
	return s.replace(/"([^"\\]*)"/g, "'$1'")
}
