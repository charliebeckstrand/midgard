import {
	Node,
	Project,
	type SourceFile,
	type VariableDeclaration,
	type VariableStatement,
} from 'ts-morph'

type Helper = { name: string; code: string }

// The demo page's entry export, loaded via `import.meta.glob(…, { import: 'Demo'
// })`. It renders as the route body, never inside an `<Example>`, so its
// `__code` is never read — skip it rather than shipping the whole page source.
const ENTRY_EXPORT = 'Demo'

// In-memory project reused across transform calls; the fixed filename is
// overwritten on each parse. Lib files are skipped — these walks are purely
// syntactic and never consult type information.
const project = new Project({ useInMemoryFileSystem: true, skipLoadingLibFiles: true })

// Matches `return <Tag`, `return (<Tag`, `return <>`, `=> <Tag`, `=> (<Tag`, `=> <>`.
// Identifier-prefixed `<` (e.g. `useState<string>()`) doesn't match; the
// pattern requires `return` or `=>` immediately before the optional paren
// and `<`.
const JSX_RETURN = /(?:return|=>)\s*\(?\s*<[A-Za-z>]/

/**
 * A top-level declaration a helper may reference but which isn't itself a
 * JSX-returning helper: type aliases, interfaces, and plain consts. `names`
 * lists the identifiers introduced; `code` is the full statement source for
 * verbatim prepending.
 */
type Preamble = { names: string[]; code: string; index: number }

/**
 * Returns the PascalCase name of a JSX-returning arrow / function-expression
 * declarator (`const Demo = () => <X />`), or null when `decl` isn't one.
 *
 * The JSX test runs against the initializer's own source, not the surrounding
 * statement: in `const A = () => <X />, B = somethingElse`, only A matches.
 * This predicate drives both helper collection and the preamble exclusion.
 */
function jsxHelperName(decl: VariableDeclaration): string | null {
	const nameNode = decl.getNameNode()

	if (!Node.isIdentifier(nameNode)) return null

	if (!/^[A-Z]/.test(nameNode.getText())) return null

	const init = decl.getInitializer()

	if (!init) return null

	if (!Node.isArrowFunction(init) && !Node.isFunctionExpression(init)) return null

	if (!JSX_RETURN.test(init.getText())) return null

	return nameNode.getText()
}

function isJsxReturningVariableStatement(stmt: VariableStatement): boolean {
	return stmt.getDeclarations().some((decl) => jsxHelperName(decl) !== null)
}

function collectPreambles(sf: SourceFile): Preamble[] {
	const preambles: Preamble[] = []

	for (const stmt of sf.getStatements()) {
		const index = stmt.getStart()

		if (Node.isTypeAliasDeclaration(stmt)) {
			preambles.push({ names: [stmt.getName()], code: stmt.getText(), index })

			continue
		}

		if (Node.isInterfaceDeclaration(stmt)) {
			preambles.push({ names: [stmt.getName()], code: stmt.getText(), index })

			continue
		}

		if (Node.isVariableStatement(stmt)) {
			const code = stmt.getText()

			// JSX-returning helper statements belong to `collectHelpers`, not the
			// preamble.
			if (isJsxReturningVariableStatement(stmt)) continue

			const names: string[] = []

			for (const decl of stmt.getDeclarations()) {
				const nameNode = decl.getNameNode()

				if (Node.isIdentifier(nameNode)) names.push(nameNode.getText())
			}

			if (names.length === 0) continue

			preambles.push({ names, code, index })
		}
	}

	return preambles
}

/**
 * Prepends every preamble whose declared names appear (as whole-word matches)
 * in the helper's source. Emits matched preambles in source order.
 *
 * This is a name scan, not a reference graph: a preamble whose name appears
 * inside a string literal or comment in the helper is included.
 */
function prependReferencedPreamble(helperCode: string, preambles: Preamble[]): string {
	const matched: Preamble[] = []

	for (const preamble of preambles) {
		const referenced = preamble.names.some((name) => new RegExp(`\\b${name}\\b`).test(helperCode))

		if (!referenced) continue

		matched.push(preamble)
	}

	if (matched.length === 0) return helperCode

	matched.sort((a, b) => a.index - b.index)

	return `${matched.map((p) => p.code).join('\n\n')}\n\n${helperCode}`
}

/**
 * Finds every PascalCase top-level function/const that returns JSX. Skips the
 * entry export `Demo` (the demo page itself) — it renders as the route body,
 * never inside `<Example>`, so attaching its source only bloats the chunk with
 * a `__code` string nothing reads.
 *
 * Prepends each helper's source with any sibling type alias, interface, or
 * `const` declaration it references by name, producing a self-contained
 * snippet.
 */
export function collectHelpers(source: string): Helper[] {
	const sf = project.createSourceFile('__collect-helpers.tsx', source, { overwrite: true })

	const preambles = collectPreambles(sf)

	const helpers: Helper[] = []

	for (const stmt of sf.getStatements()) {
		if (Node.isFunctionDeclaration(stmt)) {
			const name = stmt.getName()

			if (name && /^[A-Z]/.test(name) && stmt.getBody()) {
				if (stmt.isDefaultExport() || name === ENTRY_EXPORT) continue

				const code = stmt.getText()

				if (!JSX_RETURN.test(code)) continue

				helpers.push({ name, code: prependReferencedPreamble(code, preambles) })
			}

			continue
		}

		if (Node.isVariableStatement(stmt)) {
			for (const decl of stmt.getDeclarations()) {
				const name = jsxHelperName(decl)

				if (!name || name === ENTRY_EXPORT) continue

				const code = stmt.getText()

				helpers.push({ name, code: prependReferencedPreamble(code, preambles) })
			}
		}
	}

	return helpers
}
