import {
	isAssignmentOperator,
	isBinaryExpression,
	isJSDoc,
	isJSDocSatisfiesTag,
	isJSDocTypeTag,
	isLeftHandSideExpression,
	isModuleDeclaration,
	isParenthesizedExpression,
	isSignatureDeclaration,
	isVariableStatement,
	type JSDoc,
	type Node,
	type SignatureDeclaration,
	SyntaxKind,
} from 'typescript/unstable/ast'

// The AST helpers of TypeScript 6 that the boundary scans read and that
// TypeScript 7 does not export under the same name.

/**
 * Whether `node` is a function or a signature: the `isFunctionLike` of
 * TypeScript 6.
 *
 * @remarks
 * TypeScript 7 calls the guard `isSignatureDeclaration`. TypeScript 6 also
 * took a JSDoc signature and a JSDoc function type. A JSDoc signature sits
 * only in a doccomment, which a walk of the children does not enter. A JSDoc
 * function type is not valid TypeScript. The two guards thus agree on the
 * tree that a scan walks.
 */
export function isFunctionLike(node: Node): node is SignatureDeclaration {
	return isSignatureDeclaration(node)
}

// TypeScript 6 gave the doccomments of a node through
// `getJSDocCommentsAndTags`, and TypeScript 7 has no equal. TypeScript 7 gives
// only the doccomments that the parser attaches to a node, as `node.jsDoc`.
// The walk below is the walk of TypeScript 6 that finds the doccomments of a
// node at its parents too, such as the doccomment of `export const [a, b] = …`
// for the binding `a`.
//
// The walk leaves out one step of TypeScript 6: from a part of an assignment
// statement such as `a.b = c || d` up to that statement. No barrel export is
// such a part, and a scan of each node reads the doccomment of the statement
// at the statement itself.

/** The kinds that TypeScript 6 called variable-like: a declaration that can hold an initializer. */
const VARIABLE_LIKE = new Set([
	SyntaxKind.BindingElement,
	SyntaxKind.EnumMember,
	SyntaxKind.Parameter,
	SyntaxKind.PropertyAssignment,
	SyntaxKind.PropertyDeclaration,
	SyntaxKind.PropertySignature,
	SyntaxKind.ShorthandPropertyAssignment,
	SyntaxKind.VariableDeclaration,
])

/** The initializer of a node, or `undefined` for a node that has none. */
function initializerOf(node: Node): Node | undefined {
	return (node as Node & { initializer?: Node }).initializer
}

/** The first declaration of a variable statement, or `undefined` for another node. */
function firstVariable(node: Node): Node | undefined {
	return isVariableStatement(node) ? node.declarationList.declarations[0] : undefined
}

/** Whether `node` is an assignment, such as `a = b` or `a += b`. */
function isAssignment(node: Node): boolean {
	return (
		isBinaryExpression(node) &&
		isAssignmentOperator(node.operatorToken.kind) &&
		isLeftHandSideExpression(node.left)
	)
}

/**
 * Whether a doccomment tag belongs to `host`. A `@type` or a `@satisfies` tag
 * on a parenthesized expression belongs only to that expression.
 */
function ownsTag(host: Node, tag: Node): boolean {
	const doc = tag.parent

	return (
		!(isJSDocTypeTag(tag) || isJSDocSatisfiesTag(tag)) ||
		!doc ||
		!isJSDoc(doc) ||
		!isParenthesizedExpression(doc.parent) ||
		doc.parent === host
	)
}

/**
 * The doccomment of `node` that `host` reads: the last doccomment above the
 * node, when `host` owns each tag in it. A doccomment above the last one gives
 * only its `@overload` tags, and no doccomment.
 */
function ownedDoc(host: Node, node: Node | undefined): JSDoc[] {
	const last = node?.jsDoc?.at(-1)

	if (!last || !isJSDoc(last)) return []

	return (last.tags ?? []).every((tag) => ownsTag(host, tag)) ? [last] : []
}

/** The next node up whose doccomment also documents `node`, or `undefined`. */
function nextDocHost(node: Node): Node | undefined {
	const parent = node.parent

	const grandparent = parent.parent

	if (
		parent.kind === SyntaxKind.PropertyAssignment ||
		parent.kind === SyntaxKind.ExportAssignment ||
		parent.kind === SyntaxKind.PropertyDeclaration ||
		(parent.kind === SyntaxKind.ExpressionStatement &&
			node.kind === SyntaxKind.PropertyAccessExpression) ||
		parent.kind === SyntaxKind.ReturnStatement ||
		(isModuleDeclaration(parent) && parent.body?.kind === SyntaxKind.ModuleDeclaration) ||
		isAssignment(node)
	) {
		return parent
	}

	if (grandparent && (firstVariable(grandparent) === node || isAssignment(parent))) {
		return grandparent
	}

	const above = grandparent?.parent

	if (!above) return undefined

	// A variable statement gives its first declaration, which is never the
	// initializer of that declaration, so only a property reads its initializer.
	const initializer =
		above.kind === SyntaxKind.PropertyDeclaration || above.kind === SyntaxKind.PropertyAssignment
			? initializerOf(above)
			: undefined

	return firstVariable(above) || initializer === node ? above : undefined
}

/**
 * The doccomments that document `host`, as TypeScript 6 gave them through
 * `getJSDocCommentsAndTags`, without the tags that it gave apart from a
 * doccomment. The walk reads the initializer of a variable-like host, the
 * host, and then each parent that the doccomment of the host can sit on.
 */
export function docComments(host: Node): JSDoc[] {
	const docs: JSDoc[] = []

	const initializer = VARIABLE_LIKE.has(host.kind) ? initializerOf(host) : undefined

	if (initializer) docs.push(...ownedDoc(host, initializer))

	for (let node: Node | undefined = host; node?.parent; node = nextDocHost(node)) {
		docs.push(...ownedDoc(host, node))

		if (node.kind === SyntaxKind.Parameter || node.kind === SyntaxKind.TypeParameter) break
	}

	return docs
}
