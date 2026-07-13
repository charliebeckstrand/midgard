import ts from 'typescript'

// Carried over from the retired docs engine: the surface-index gate is the
// only remaining consumer of barrel re-export parsing.

/**
 * A single named re-export parsed from a barrel: its source module, the local
 * (imported) name, the exported name, and whether the specifier is type-only.
 */
export type ReExport = { source: string; localName: string; exportedName: string; isType: boolean }

/**
 * Parse `export { A, type B, C } from '...'` statements out of an index file.
 * Ignores other top-level forms (default exports, plain `export const`).
 */
export function parseReExports(source: string, fileName: string): ReExport[] {
	const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)

	const result: ReExport[] = []

	for (const stmt of sf.statements) {
		if (!ts.isExportDeclaration(stmt)) continue

		if (!stmt.moduleSpecifier || !ts.isStringLiteral(stmt.moduleSpecifier)) continue

		if (!stmt.exportClause || !ts.isNamedExports(stmt.exportClause)) continue

		const moduleSpecifier = stmt.moduleSpecifier.text

		const wholeIsType = stmt.isTypeOnly

		for (const spec of stmt.exportClause.elements) {
			result.push({
				source: moduleSpecifier,
				localName: spec.propertyName?.text ?? spec.name.text,
				exportedName: spec.name.text,
				isType: wholeIsType || spec.isTypeOnly,
			})
		}
	}

	return result
}
