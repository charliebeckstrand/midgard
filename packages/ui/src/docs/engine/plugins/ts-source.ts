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

/** The identifiers that a binding name declares, through any destructuring pattern. */
function bindingNames(name: ts.BindingName, into: string[]): void {
	if (ts.isIdentifier(name)) {
		into.push(name.text)

		return
	}

	for (const element of name.elements) {
		if (ts.isBindingElement(element)) bindingNames(element.name, into)
	}
}

/** The names that a declaration list declares. */
function listNames(list: ts.VariableDeclarationList): string[] {
	const names: string[] = []

	for (const declaration of list.declarations) bindingNames(declaration.name, names)

	return names
}

/**
 * The names that a block's own statements declare: `let`, `const`, a
 * function, a class, and a type. A `var` belongs to the enclosing function.
 */
function lexicalNames(statements: readonly ts.Statement[]): string[] {
	return statements.flatMap((statement) => {
		if (ts.isVariableStatement(statement)) {
			const list = statement.declarationList

			return list.flags & ts.NodeFlags.BlockScoped ? listNames(list) : []
		}

		const named =
			ts.isFunctionDeclaration(statement) ||
			ts.isClassDeclaration(statement) ||
			ts.isTypeAliasDeclaration(statement) ||
			ts.isInterfaceDeclaration(statement) ||
			ts.isEnumDeclaration(statement)

		return named && statement.name ? [statement.name.text] : []
	})
}

/** The names that each `var` in a function body declares, short of a nested function. */
function varNames(body: ts.Node, into: string[]): void {
	const visit = (node: ts.Node): void => {
		if (ts.isFunctionLike(node)) return

		if (ts.isVariableDeclarationList(node) && !(node.flags & ts.NodeFlags.BlockScoped)) {
			into.push(...listNames(node))
		}

		ts.forEachChild(node, visit)
	}

	visit(body)
}

/**
 * The names that a node declares for its own scope, or null for a node that
 * opens no scope. A function scopes its parameters, its type parameters, its
 * own name as an expression, and each `var` in its body. A block scopes its
 * lexical declarations, and a loop, a `catch`, a class, a type alias, an
 * interface, and a mapped type scope the names in their heads.
 */
function scopeOf(node: ts.Node): string[] | null {
	if (ts.isFunctionLike(node)) {
		const names: string[] = []

		for (const parameter of node.parameters) bindingNames(parameter.name, names)

		for (const parameter of node.typeParameters ?? []) names.push(parameter.name.text)

		if (ts.isFunctionExpression(node) && node.name) names.push(node.name.text)

		const { body } = node as ts.FunctionLikeDeclaration

		if (body) varNames(body, names)

		return names
	}

	if (ts.isBlock(node)) return lexicalNames(node.statements)

	if (ts.isCaseBlock(node)) return node.clauses.flatMap((clause) => lexicalNames(clause.statements))

	if (ts.isForStatement(node) || ts.isForInStatement(node) || ts.isForOfStatement(node)) {
		const head = node.initializer

		return head && ts.isVariableDeclarationList(head) ? listNames(head) : null
	}

	if (ts.isCatchClause(node)) {
		const names: string[] = []

		if (node.variableDeclaration) bindingNames(node.variableDeclaration.name, names)

		return names
	}

	if (ts.isClassLike(node)) {
		const names = (node.typeParameters ?? []).map((parameter) => parameter.name.text)

		return ts.isClassExpression(node) && node.name ? [...names, node.name.text] : names
	}

	if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
		return (node.typeParameters ?? []).map((parameter) => parameter.name.text)
	}

	if (ts.isMappedTypeNode(node)) return [node.typeParameter.name.text]

	return null
}

/**
 * The names that a node uses from outside it: each identifier in a value or a
 * type position. A declared name, a property name, a JSX attribute name, a
 * string, JSX text, and a comment are no use. A name that a scope inside the
 * node declares, such as a parameter or a local, is no use of the outer name
 * there.
 */
export function referencedNames(node: ts.Node): Set<string> {
	const names = new Set<string>()

	const scopes: Set<string>[] = []

	const visit = (current: ts.Node): void => {
		if (ts.isIdentifier(current)) {
			const local = scopes.some((scope) => scope.has(current.text))

			if (!local && !isNamePosition(current)) names.add(current.text)

			return
		}

		const declared = scopeOf(current)

		if (declared) scopes.push(new Set(declared))

		ts.forEachChild(current, visit)

		if (declared) scopes.pop()
	}

	visit(node)

	return names
}
