import ts from 'typescript'

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
