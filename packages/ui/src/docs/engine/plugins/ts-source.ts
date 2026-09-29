import ts from '@typescript/typescript6'

/** Parse `code` into a full-fidelity source file (parent pointers set) for the plugins' syntactic passes. */
export function parseSource(
	fileName: string,
	code: string,
	kind: ts.ScriptKind = ts.ScriptKind.TSX,
): ts.SourceFile {
	return ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, true, kind)
}

/**
 * The module specifier and named specifiers of a value import
 * (`import { A, b } from 'x'`), or null for any other statement — type-only,
 * default-only, and namespace imports included.
 */
export function namedImportsOf(
	stmt: ts.Statement,
): { specifier: string; elements: readonly ts.ImportSpecifier[] } | null {
	if (!ts.isImportDeclaration(stmt) || !ts.isStringLiteral(stmt.moduleSpecifier)) return null

	const clause = stmt.importClause

	if (!clause || clause.isTypeOnly || !clause.namedBindings) return null

	if (!ts.isNamedImports(clause.namedBindings)) return null

	return { specifier: stmt.moduleSpecifier.text, elements: clause.namedBindings.elements }
}

/**
 * Whether an identifier is a name that its parent declares or keys, not a use
 * of a binding: a declared name, a property or member name, a JSX attribute
 * name, the key of a destructured property, or an intrinsic JSX tag.
 */
function isNamePosition(id: ts.Identifier): boolean {
	const parent = id.parent

	if (ts.isPropertyAccessExpression(parent)) return parent.name === id

	if (ts.isQualifiedName(parent)) return parent.right === id

	if (ts.isBindingElement(parent)) return parent.propertyName === id || parent.name === id

	if (
		ts.isJsxOpeningElement(parent) ||
		ts.isJsxSelfClosingElement(parent) ||
		ts.isJsxClosingElement(parent)
	) {
		return parent.tagName === id && /^[a-z]/.test(id.text)
	}

	if (ts.isShorthandPropertyAssignment(parent)) return false

	const declaration = parent as ts.NamedDeclaration

	return declaration.name === id
}

/**
 * The names that a node uses: each identifier in a value or a type position.
 * A declared name, a property name, a JSX attribute name, a string, JSX text,
 * and a comment are no use. This is a syntactic pass, so a name that a nested
 * scope declares again still counts as a use of the outer name.
 */
export function referencedNames(node: ts.Node): Set<string> {
	const names = new Set<string>()

	const visit = (current: ts.Node): void => {
		if (ts.isIdentifier(current)) {
			if (!isNamePosition(current)) names.add(current.text)

			return
		}

		ts.forEachChild(current, visit)
	}

	visit(node)

	return names
}
