import path from 'node:path'
import ts from 'typescript'
import type { DeclarationFact, ElementFact, ImportFact } from '../derive-code/types'
import { IGNORED_PROPS } from '../reserved-props'
import { isJsxHelperStatement } from './collect-helpers'

/**
 * Build-time companion to the runtime walker: extracts per-`Example` source
 * facts from a demo's TSX — authored prop expressions, render-prop children,
 * the declarations they reference, and where their identifiers import from —
 * and injects them as a `__facts` prop so `deriveCode` can synthesize what
 * runtime values can't express (see `derive-code/types.ts` for the shapes).
 *
 * Extraction is name-based, mirroring the `__code` preamble matching: bindings
 * resolve lexically per Example (module scope, then each enclosing function),
 * and reference detection downstream is a whole-word scan, not a checker pass.
 */
export type SourceFactsOptions = {
	/** Absolute path of the demo file; anchors relative-import resolution. */
	filePath: string
	/** The library source root (the directory holding `components/`). */
	srcDir: string
}

const isPascalCase = (name: string) => /^[A-Z]/.test(name)

// The demo-authoring frame itself. Its own props are never facts, and a nested
// occurrence owns its own extraction.
const EXAMPLE_TAG = 'Example'

// The injected array the spliced `__facts` attributes index into. Appended at
// module scope, read from render scope, so evaluation order is safe.
const FACTS_CONST = '__exampleFacts'

// ---------------------------------------------------------------------------
// Element facts
// ---------------------------------------------------------------------------

/**
 * Expression kinds the runtime walker already recovers from live values;
 * recording their source would only override live rendering with a stale copy.
 */
function isRuntimeRecoverable(expr: ts.Expression): boolean {
	if (
		ts.isStringLiteral(expr) ||
		ts.isNoSubstitutionTemplateLiteral(expr) ||
		ts.isNumericLiteral(expr)
	) {
		return true
	}

	if (expr.kind === ts.SyntaxKind.TrueKeyword || expr.kind === ts.SyntaxKind.FalseKeyword) {
		return true
	}

	// A negated numeric literal (`tabIndex={-1}`).
	return (
		ts.isPrefixUnaryExpression(expr) &&
		expr.operator === ts.SyntaxKind.MinusToken &&
		ts.isNumericLiteral(expr.operand)
	)
}

function tagNameOf(node: ts.JsxElement | ts.JsxSelfClosingElement): string | null {
	const tag = ts.isJsxElement(node) ? node.openingElement.tagName : node.tagName

	return ts.isIdentifier(tag) && isPascalCase(tag.text) ? tag.text : null
}

function attributesOf(node: ts.JsxElement | ts.JsxSelfClosingElement): ts.JsxAttributes {
	return ts.isJsxElement(node) ? node.openingElement.attributes : node.attributes
}

/**
 * The element's meaningful children — everything but whitespace-only JSX text.
 */
function meaningfulChildren(node: ts.JsxElement): ts.JsxChild[] {
	return node.children.filter((child) => !(ts.isJsxText(child) && child.text.trim() === ''))
}

/**
 * A render-prop child: the element's sole meaningful child is an expression
 * container holding a function. The walker can never invoke it at runtime, so
 * its source is the only possible rendering.
 */
function renderPropChild(node: ts.JsxElement): ts.Expression | null {
	const children = meaningfulChildren(node)

	const only = children.length === 1 ? children[0] : undefined

	if (!only || !ts.isJsxExpression(only) || !only.expression) return null

	const expr = only.expression

	return ts.isArrowFunction(expr) || ts.isFunctionExpression(expr) ? expr : null
}

function propFacts(node: ts.JsxElement | ts.JsxSelfClosingElement, sf: ts.SourceFile) {
	const props: Record<string, string> = {}

	for (const attr of attributesOf(node).properties) {
		if (!ts.isJsxAttribute(attr) || !ts.isIdentifier(attr.name)) continue

		const key = attr.name.text

		if (IGNORED_PROPS.has(key)) continue

		const init = attr.initializer

		if (!init || ts.isStringLiteral(init)) continue

		if (!ts.isJsxExpression(init) || !init.expression) continue

		if (isRuntimeRecoverable(init.expression)) continue

		props[key] = init.expression.getText(sf)
	}

	return props
}

/**
 * Collect facts for every PascalCase element the runtime walker can reach
 * inside an Example's children, in source order. Recursion descends through
 * elements, fragments, and expressions (map callbacks, conditionals — those
 * produce walker-visible elements) but not into render-prop children (emitted
 * verbatim, never walked) or nested `Example`s (they own their extraction).
 * Elements contributing no facts are omitted; the walker needs no entry to
 * render them, and absent entries can never mis-match.
 */
function collectElementFacts(children: readonly ts.Node[], sf: ts.SourceFile): ElementFact[] {
	const facts: ElementFact[] = []

	const visit = (node: ts.Node): void => {
		if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
			const name = tagNameOf(node)

			if (name === EXAMPLE_TAG) return

			if (name) {
				const props = propFacts(node, sf)

				const renderProp = ts.isJsxElement(node) ? renderPropChild(node) : null

				if (Object.keys(props).length > 0 || renderProp) {
					facts.push({
						name,
						props,
						...(renderProp ? { children: renderProp.getText(sf) } : {}),
					})
				}

				if (renderProp) return
			}

			if (ts.isJsxElement(node)) node.children.forEach(visit)

			return
		}

		ts.forEachChild(node, visit)
	}

	for (const child of children) visit(child)

	return facts
}

// ---------------------------------------------------------------------------
// Declarations and bindings
// ---------------------------------------------------------------------------

type Declaration = DeclarationFact & { index: number }

function boundNames(name: ts.BindingName, into: string[]): void {
	if (ts.isIdentifier(name)) {
		into.push(name.text)

		return
	}

	for (const element of name.elements) {
		if (ts.isBindingElement(element)) boundNames(element.name, into)
	}
}

/**
 * The identifiers a statement declares, with its verbatim source. Returns
 * null for statements a preamble can't use (imports, expressions, exports of
 * the entry component). `excludeJsxHelpers` drops helper components at module
 * scope — they render through the `__code` pipeline instead; inside function
 * bodies everything counts (a local `const icon = <Star />` is legitimate
 * preamble).
 */
function declarationOf(
	stmt: ts.Statement,
	sf: ts.SourceFile,
	source: string,
	excludeJsxHelpers: boolean,
): Omit<Declaration, 'index'> | null {
	if (excludeJsxHelpers && isJsxHelperStatement(stmt, sf, source)) return null

	const code = source.slice(stmt.getStart(sf), stmt.getEnd())

	if (ts.isTypeAliasDeclaration(stmt) || ts.isInterfaceDeclaration(stmt)) {
		return { names: [stmt.name.text], code }
	}

	if (ts.isEnumDeclaration(stmt)) return { names: [stmt.name.text], code }

	if (ts.isFunctionDeclaration(stmt) && stmt.name) return { names: [stmt.name.text], code }

	if (ts.isVariableStatement(stmt)) {
		const names: string[] = []

		for (const decl of stmt.declarationList.declarations) boundNames(decl.name, names)

		return names.length > 0 ? { names, code } : null
	}

	return null
}

/** The chain of functions enclosing `node`, innermost first. */
function enclosingFunctions(node: ts.Node): ts.FunctionLikeDeclaration[] {
	const chain: ts.FunctionLikeDeclaration[] = []

	for (let current = node.parent; current; current = current.parent) {
		if (
			ts.isFunctionDeclaration(current) ||
			ts.isArrowFunction(current) ||
			ts.isFunctionExpression(current)
		) {
			chain.push(current)
		}
	}

	return chain
}

function bodyStatements(fn: ts.FunctionLikeDeclaration): readonly ts.Statement[] {
	return fn.body && ts.isBlock(fn.body) ? fn.body.statements : []
}

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

/**
 * Map a demo's relative import to the library's public module name, mirroring
 * the barrel layout `moduleNameFor` tags (`components/fieldset` → `fieldset`,
 * `providers/locale` → `providers/locale`). Returns null for docs-internal or
 * otherwise unmapped paths; their identifiers get no import line.
 */
function publicModuleFor(resolved: string, srcDir: string): string | null {
	const rel = path.relative(srcDir, resolved).split(path.sep)

	if (rel[0] === 'components' && rel[1]) return rel[1]

	if (rel[0] === 'providers' && rel[1]) return `providers/${rel[1]}`

	if (rel[0] === 'modules' && rel[1]) return `modules/${rel[1]}`

	if (rel[0] === 'layouts') return 'layouts'

	return null
}

/**
 * The identifiers a demo imports and where a reader would import them from:
 * relative specifiers map onto public library modules, bare specifiers stay
 * external. Aliased and type-only specifiers are skipped — an emitted import
 * line would misname or over-claim them.
 */
function importFacts(
	sf: ts.SourceFile,
	{ filePath, srcDir }: SourceFactsOptions,
): Record<string, ImportFact> {
	const facts: Record<string, ImportFact> = {}

	for (const stmt of sf.statements) {
		if (!ts.isImportDeclaration(stmt) || !ts.isStringLiteral(stmt.moduleSpecifier)) continue

		const specifier = stmt.moduleSpecifier.text

		const clause = stmt.importClause

		if (!clause || clause.isTypeOnly || !clause.namedBindings) continue

		if (!ts.isNamedImports(clause.namedBindings)) continue

		const fact: ImportFact | null = specifier.startsWith('.')
			? (() => {
					const module = publicModuleFor(path.resolve(path.dirname(filePath), specifier), srcDir)

					return module ? { module } : null
				})()
			: { module: specifier, external: true }

		if (!fact) continue

		for (const spec of clause.namedBindings.elements) {
			if (spec.isTypeOnly || spec.propertyName) continue

			facts[spec.name.text] = fact
		}
	}

	return facts
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

const wordRe = (name: string) => new RegExp(`\\b${name.replaceAll('$', '\\$')}\\b`)

/** One qualifying `<Example>`: where to splice, and its per-Example facts. */
export type ExampleSite = {
	/** Splice position: right after the opening tag's name. */
	insertAt: number
	elements: ElementFact[]
	bindings: Record<string, number>
}

/** A demo file's extraction: per-Example sites plus the file-shared tables. */
export type FileFacts = {
	sites: ExampleSite[]
	declarations: DeclarationFact[]
	imports: Record<string, ImportFact>
}

/**
 * Extract source facts for every `<Example>` in a demo: per-Example element
 * facts and lexical bindings, plus the file-shared declaration and import
 * tables, pruned to what the facts can transitively reference. Returns null
 * when no Example yields facts. Examples with an explicit `code` attribute
 * are skipped — the override wins at runtime, so facts would be dead weight
 * in the chunk — as are Examples whose children carry no expression props or
 * render props (the walker needs no help there).
 */
export function extractSourceFacts(
	source: string,
	options: SourceFactsOptions,
	sourceFile?: ts.SourceFile,
): FileFacts | null {
	const sf =
		sourceFile ??
		ts.createSourceFile('demo.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)

	// Every <Example> element, in source order.
	const examples: ts.JsxElement[] = []

	const findExamples = (node: ts.Node): void => {
		if (ts.isJsxElement(node) && tagNameOf(node) === EXAMPLE_TAG) examples.push(node)

		ts.forEachChild(node, findExamples)
	}

	findExamples(sf)

	if (examples.length === 0) return null

	// The shared declaration table: module-scope statements plus the bodies of
	// functions enclosing any Example, in source order.
	const statementScopes = new Map<ts.Statement, Omit<Declaration, 'index'> | null>()

	const declarationFor = (stmt: ts.Statement, excludeJsxHelpers: boolean) => {
		if (!statementScopes.has(stmt)) {
			statementScopes.set(stmt, declarationOf(stmt, sf, source, excludeJsxHelpers))
		}

		return statementScopes.get(stmt) ?? null
	}

	const declarations: Declaration[] = []

	const declarationIndex = new Map<ts.Statement, number>()

	const indexOf = (stmt: ts.Statement, excludeJsxHelpers: boolean): number | null => {
		const existing = declarationIndex.get(stmt)

		if (existing !== undefined) return existing

		const decl = declarationFor(stmt, excludeJsxHelpers)

		if (!decl) return null

		const index = declarations.length

		declarations.push({ ...decl, index })

		declarationIndex.set(stmt, index)

		return index
	}

	const imports = importFacts(sf, options)

	const sites: ExampleSite[] = []

	for (const example of examples) {
		const attrs = example.openingElement.attributes.properties

		const hasCode = attrs.some(
			(attr) => ts.isJsxAttribute(attr) && ts.isIdentifier(attr.name) && attr.name.text === 'code',
		)

		if (hasCode) continue

		const elements = collectElementFacts(meaningfulChildren(example), sf)

		if (elements.length === 0) continue

		// Bindings resolve lexically: module scope first, then each enclosing
		// function from outermost in, so inner declarations shadow outer ones.
		const bindings: Record<string, number> = {}

		const bind = (stmts: readonly ts.Statement[], excludeJsxHelpers: boolean) => {
			for (const stmt of stmts) {
				const index = indexOf(stmt, excludeJsxHelpers)

				if (index === null) continue

				const decl = declarations[index]

				if (decl) for (const name of decl.names) bindings[name] = index
			}
		}

		bind(sf.statements, true)

		for (const fn of enclosingFunctions(example).reverse()) bind(bodyStatements(fn), false)

		sites.push({ insertAt: example.openingElement.tagName.getEnd(), elements, bindings })
	}

	if (sites.length === 0) return null

	// Prune the table to declarations the facts can transitively reference —
	// a union closure over every site, so unreferenced module consts (demo
	// data the walker renders live) never ship.
	const texts = sites.flatMap((site) =>
		site.elements.flatMap((el) => [
			...Object.values(el.props),
			...(el.children ? [el.children] : []),
		]),
	)

	const reachable = new Set<number>()

	let progress = true

	while (progress) {
		progress = false

		for (const site of sites) {
			for (const [name, index] of Object.entries(site.bindings)) {
				if (reachable.has(index)) continue

				const re = wordRe(name)

				if (!texts.some((text) => re.test(text))) continue

				reachable.add(index)

				const code = declarations[index]?.code

				if (code) texts.push(code)

				progress = true
			}
		}
	}

	const kept = declarations.filter((decl) => reachable.has(decl.index))

	const remap = new Map(kept.map((decl, next) => [decl.index, next]))

	const sharedDeclarations: DeclarationFact[] = kept.map(({ names, code }) => ({ names, code }))

	// Imports prune the same way: only names the shipped texts mention.
	const sharedImports: Record<string, ImportFact> = {}

	for (const [name, fact] of Object.entries(imports)) {
		const re = wordRe(name)

		if (texts.some((text) => re.test(text))) sharedImports[name] = fact
	}

	const remappedBindings = (site: ExampleSite): Record<string, number> => {
		const bindings: Record<string, number> = {}

		for (const [name, index] of Object.entries(site.bindings)) {
			const next = remap.get(index)

			if (next !== undefined) bindings[name] = next
		}

		return bindings
	}

	return {
		sites: sites.map((site) => ({ ...site, bindings: remappedBindings(site) })),
		declarations: sharedDeclarations,
		imports: sharedImports,
	}
}

/**
 * Splice a demo's extracted facts into its source: each qualifying Example's
 * open tag gains `__facts={__exampleFacts[k]}`, and one module-level const
 * carrying the facts — the shared declaration/import tables spread into each
 * per-Example entry — lands at the end of the file. The const is declared at
 * module scope but read from render scope, so it is initialized before any
 * Example renders. Returns null when no Example yields facts, leaving the
 * module untouched.
 */
export function injectSourceFacts(
	source: string,
	options: SourceFactsOptions,
	sourceFile?: ts.SourceFile,
): string | null {
	const facts = extractSourceFacts(source, options, sourceFile)

	if (!facts) return null

	// Splice from the end so earlier positions stay valid.
	let out = source

	for (let i = facts.sites.length - 1; i >= 0; i--) {
		const site = facts.sites[i]

		if (!site) continue

		out = `${out.slice(0, site.insertAt)} __facts={${FACTS_CONST}[${i}]}${out.slice(site.insertAt)}`
	}

	const shared = JSON.stringify({ declarations: facts.declarations, imports: facts.imports })

	const perExample = facts.sites
		.map(
			(site) =>
				`{ ...__exampleFactsShared, elements: ${JSON.stringify(site.elements)}, bindings: ${JSON.stringify(site.bindings)} }`,
		)
		.join(', ')

	return `${out}\n\n;const __exampleFactsShared = ${shared};\n;const ${FACTS_CONST} = [${perExample}];\n`
}
