import path from 'node:path'
import ts from '@typescript/typescript6'
import {
	type DeclarationFact,
	type ElementFact,
	hasFacts,
	type ImportFact,
} from '../derive-code/types'
import { isPascalCase } from '../identifiers'
import { IGNORED_PROPS } from '../reserved-props'
import { isPageStatement } from './collect-helpers'
import { namedImportsOf, parseSource, referencedNames } from './ts-source'

/**
 * Build-time companion to the runtime walker. It extracts per-`Example` source
 * facts from a demo's TSX. Those are the authored prop expressions, the
 * render-prop children, the declarations they reference, and where their
 * identifiers import from. It injects them as a `__facts` prop, so `deriveCode`
 * can synthesize what runtime values can't express (see `derive-code/types.ts`
 * for the shapes).
 *
 * Extraction is name-based, mirroring the helper snippets' dependency matching. Bindings
 * resolve lexically per Example: module scope, then each enclosing function.
 * Reference detection downstream is a whole-word scan, not a checker pass.
 */
export type SourceFactsOptions = {
	/** Absolute path of the demo file; anchors relative-import resolution. */
	filePath: string
	/** The library source root (the directory holding `components/`). */
	srcDir: string
}

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
 *
 * @remarks
 * `false` is not one of them. The walker reads a live `false` as an absent
 * prop, so an authored `false` that turns off a default (`closable={false}`)
 * needs its fact to print.
 */
function isRuntimeRecoverable(expr: ts.Expression): boolean {
	if (
		ts.isStringLiteral(expr) ||
		ts.isNoSubstitutionTemplateLiteral(expr) ||
		ts.isNumericLiteral(expr) ||
		expr.kind === ts.SyntaxKind.TrueKeyword
	) {
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

/**
 * The names that the JSX of an Example binds itself: the parameters of each
 * callback in it, such as the item of a `.map`, and the variables that a
 * callback body declares. JSX declares a name nowhere else.
 */
function localNames(nodes: readonly ts.Node[]): Set<string> {
	const names: string[] = []

	const visit = (node: ts.Node): void => {
		if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
			for (const param of node.parameters) boundNames(param.name, names)
		}

		if (ts.isVariableDeclaration(node)) boundNames(node.name, names)

		ts.forEachChild(node, visit)
	}

	for (const node of nodes) visit(node)

	return new Set(names)
}

/**
 * Whether `expr` uses one of `names` as a value. A property name, a JSX
 * attribute name, and a name that `expr` binds itself do not count.
 */
function usesAny(expr: ts.Expression, names: Set<string>): boolean {
	const own = localNames([expr])

	const visit = (node: ts.Node): boolean => {
		if (ts.isIdentifier(node) && names.has(node.text) && !own.has(node.text)) {
			const parent = node.parent

			const isName =
				(ts.isPropertyAccessExpression(parent) ||
					ts.isPropertyAssignment(parent) ||
					ts.isJsxAttribute(parent)) &&
				parent.name === node

			if (!isName) return true
		}

		return ts.forEachChild(node, visit) ?? false
	}

	return visit(expr)
}

/**
 * The expression props of an element, as source text, the keys among them
 * whose source uses a name of `locals`, and every name that their sources use.
 */
function propFacts(
	node: ts.JsxElement | ts.JsxSelfClosingElement,
	sf: ts.SourceFile,
	locals: Set<string>,
) {
	const props: Record<string, string> = {}

	const local: string[] = []

	const uses = new Set<string>()

	for (const attr of attributesOf(node).properties) {
		if (!ts.isJsxAttribute(attr) || !ts.isIdentifier(attr.name)) continue

		const key = attr.name.text

		if (IGNORED_PROPS.has(key)) continue

		const init = attr.initializer

		if (!init || ts.isStringLiteral(init)) continue

		if (!ts.isJsxExpression(init) || !init.expression) continue

		if (isRuntimeRecoverable(init.expression)) continue

		props[key] = init.expression.getText(sf)

		if (locals.size > 0 && usesAny(init.expression, locals)) local.push(key)

		for (const name of referencedNames(init.expression)) uses.add(name)
	}

	return { props, local, uses }
}

/**
 * Collect facts for every PascalCase element the runtime walker can reach
 * inside an Example's children, in source order. Recursion descends through
 * elements, fragments, and expressions such as map callbacks and conditionals,
 * which produce walker-visible elements. It does not descend into render-prop
 * children (emitted verbatim, never walked), or nested `Example`s (they own
 * their extraction).
 *
 * A tag with no facts on any of its elements is omitted. A tag with facts on
 * some of its elements keeps an entry for each one, an empty entry included.
 * The walk pairs the k-th element of a tag that it renders with the k-th entry
 * of that tag, so each entry holds its position.
 *
 * `uses` holds every name that the recorded sources use, the start of the
 * declaration closure.
 */
function collectElementFacts(
	children: readonly ts.Node[],
	sf: ts.SourceFile,
): { elements: ElementFact[]; uses: Set<string> } {
	const facts: ElementFact[] = []

	const uses = new Set<string>()

	const locals = localNames(children)

	const visit = (node: ts.Node): void => {
		if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
			const name = tagNameOf(node)

			if (name === EXAMPLE_TAG) return

			if (name) {
				const { props, local, uses: propUses } = propFacts(node, sf, locals)

				const renderProp = ts.isJsxElement(node) ? renderPropChild(node) : null

				for (const used of propUses) uses.add(used)

				if (renderProp) for (const used of referencedNames(renderProp)) uses.add(used)

				facts.push({
					name,
					props,
					...(local.length > 0 ? { local } : {}),
					...(renderProp ? { children: renderProp.getText(sf) } : {}),
				})

				if (renderProp) return
			}

			if (ts.isJsxElement(node)) node.children.forEach(visit)

			return
		}

		ts.forEachChild(node, visit)
	}

	for (const child of children) visit(child)

	const withFacts = new Set(facts.filter(hasFacts).map(({ name }) => name))

	return { elements: facts.filter(({ name }) => withFacts.has(name)), uses }
}

// ---------------------------------------------------------------------------
// Declarations and bindings
// ---------------------------------------------------------------------------

/** A declaration of the table, with the names that it uses. */
type Declaration = DeclarationFact & { index: number; uses: Set<string> }

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
 * null for statements a preamble can't use: imports, expressions, and, at
 * `moduleScope`, the demo page itself. A helper component counts like any
 * declaration, so a pulled declaration that names one pulls it too. The walk
 * prints a declaration once, whether a helper snippet or a fact pulls it.
 */
function declarationOf(
	stmt: ts.Statement,
	sf: ts.SourceFile,
	moduleScope: boolean,
): Omit<Declaration, 'index'> | null {
	if (moduleScope && isPageStatement(stmt)) return null

	const code = stmt.getText(sf)

	if (
		ts.isTypeAliasDeclaration(stmt) ||
		ts.isInterfaceDeclaration(stmt) ||
		ts.isEnumDeclaration(stmt) ||
		ts.isFunctionDeclaration(stmt)
	) {
		// Only a function declaration can be anonymous (`export default function`).
		return stmt.name ? { names: [stmt.name.text], uses: referencedNames(stmt), code } : null
	}

	if (ts.isVariableStatement(stmt)) {
		const names: string[] = []

		for (const decl of stmt.declarationList.declarations) boundNames(decl.name, names)

		return names.length > 0 ? { names, uses: referencedNames(stmt), code } : null
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
 * `providers/locale` → `providers/locale`, `structure/flex` → `structure/flex`). The `core` and `hooks` barrels and
 * each `primitives/<name>` map too, because `package.json` exports them. A path
 * below the `core` or `hooks` barrel has no export, so it stays unmapped.
 * Returns null for docs-internal or otherwise unmapped paths; their
 * identifiers get no import line.
 */
function publicModuleFor(resolved: string, srcDir: string): string | null {
	const rel = path.relative(srcDir, resolved).split(path.sep)

	if (rel[0] === 'components' && rel[1]) return rel[1]

	if (rel[0] === 'providers' && rel[1]) return `providers/${rel[1]}`

	if (rel[0] === 'modules' && rel[1]) return `modules/${rel[1]}`

	if (rel[0] === 'structure' && rel[1]) return `structure/${rel[1]}`

	if (rel[0] === 'primitives' && rel[1]) return `primitives/${rel[1]}`

	if (rel[0] === 'layouts') return 'layouts'

	if ((rel[0] === 'core' || rel[0] === 'hooks') && rel.length === 1) return rel[0]

	return null
}

/**
 * The named specifiers of an `import type { … }` declaration, or null for any
 * other statement.
 */
function typeImportsOf(
	stmt: ts.Statement,
): { specifier: string; elements: readonly ts.ImportSpecifier[] } | null {
	if (!ts.isImportDeclaration(stmt) || !ts.isStringLiteral(stmt.moduleSpecifier)) return null

	const bindings = stmt.importClause?.isTypeOnly ? stmt.importClause.namedBindings : undefined

	if (!bindings || !ts.isNamedImports(bindings)) return null

	return { specifier: stmt.moduleSpecifier.text, elements: bindings.elements }
}

/**
 * The identifiers a demo imports and where a reader would import them from:
 * relative specifiers map onto public library modules, bare specifiers stay
 * external. A type-only specifier carries `type`, so its line reads
 * `type Name`. Aliased specifiers are skipped, because an emitted import line
 * would misname them.
 */
export function importFacts(
	sf: ts.SourceFile,
	{ filePath, srcDir }: SourceFactsOptions,
): Record<string, ImportFact> {
	const facts: Record<string, ImportFact> = {}

	for (const stmt of sf.statements) {
		const typeOnly = typeImportsOf(stmt)

		const named = typeOnly ?? namedImportsOf(stmt)

		if (!named) continue

		const { specifier, elements } = named

		const isRelative = specifier.startsWith('.')

		const module = isRelative
			? publicModuleFor(path.resolve(path.dirname(filePath), specifier), srcDir)
			: specifier

		if (!module) continue

		const fact: ImportFact = isRelative ? { module } : { module, external: true }

		for (const spec of elements) {
			if (spec.propertyName) continue

			facts[spec.name.text] = typeOnly || spec.isTypeOnly ? { ...fact, type: true } : fact
		}
	}

	return facts
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

/** One qualifying `<Example>`: where to splice, and its per-Example facts. */
type ExampleSite = {
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
 * Extract source facts for every `<Example>` in a demo. The result is
 * per-Example element facts and lexical bindings, plus the file-shared
 * declaration and import tables. Those tables are pruned to what the facts can
 * transitively reference. Returns null when no Example yields facts. Examples
 * with an explicit `code` attribute are skipped, because the override wins at
 * runtime and facts would be dead weight in the chunk. Examples whose children
 * carry no expression props or render props are skipped too, because the walker
 * needs no help there.
 */
export function extractSourceFacts(
	source: string,
	options: SourceFactsOptions,
	sourceFile?: ts.SourceFile,
): FileFacts | null {
	const sf = sourceFile ?? parseSource('demo.tsx', source)

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

	const declarationFor = (stmt: ts.Statement, moduleScope: boolean) => {
		if (!statementScopes.has(stmt)) {
			statementScopes.set(stmt, declarationOf(stmt, sf, moduleScope))
		}

		return statementScopes.get(stmt) ?? null
	}

	const declarations: Declaration[] = []

	const declarationIndex = new Map<ts.Statement, number>()

	const indexOf = (stmt: ts.Statement, moduleScope: boolean): number | null => {
		const existing = declarationIndex.get(stmt)

		if (existing !== undefined) return existing

		const decl = declarationFor(stmt, moduleScope)

		if (!decl) return null

		const index = declarations.length

		declarations.push({ ...decl, index })

		declarationIndex.set(stmt, index)

		return index
	}

	const imports = importFacts(sf, options)

	const sites: ExampleSite[] = []

	// Every name that a recorded source uses, across the sites.
	const needed = new Set<string>()

	for (const example of examples) {
		const attrs = example.openingElement.attributes.properties

		const hasCode = attrs.some(
			(attr) => ts.isJsxAttribute(attr) && ts.isIdentifier(attr.name) && attr.name.text === 'code',
		)

		if (hasCode) continue

		const { elements, uses } = collectElementFacts(meaningfulChildren(example), sf)

		for (const name of uses) needed.add(name)

		if (elements.length === 0) continue

		// Bindings resolve lexically: module scope first, then each enclosing
		// function from outermost in, so inner declarations shadow outer ones.
		const bindings: Record<string, number> = {}

		const bind = (stmts: readonly ts.Statement[], moduleScope: boolean) => {
			for (const stmt of stmts) {
				const index = indexOf(stmt, moduleScope)

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
	// data the walker renders live) never ship. A reference is a use in a value
	// or a type position, never a word in a string, in JSX text, or in a comment.
	const reachable = new Set<number>()

	let progress = true

	while (progress) {
		progress = false

		for (const site of sites) {
			for (const [name, index] of Object.entries(site.bindings)) {
				if (reachable.has(index) || !needed.has(name)) continue

				reachable.add(index)

				for (const used of declarations[index]?.uses ?? []) needed.add(used)

				progress = true
			}
		}
	}

	const kept = declarations.filter((decl) => reachable.has(decl.index))

	const remap = new Map(kept.map((decl, next) => [decl.index, next]))

	const sharedDeclarations: DeclarationFact[] = kept.map(({ names, code }) => ({ names, code }))

	// Imports prune the same way: only names that the shipped sources use.
	const sharedImports = Object.fromEntries(
		Object.entries(imports).filter(([name]) => needed.has(name)),
	)

	const remappedBindings = (site: ExampleSite): Record<string, number> =>
		Object.fromEntries(
			Object.entries(site.bindings).flatMap(([name, index]): [string, number][] => {
				const next = remap.get(index)

				return next === undefined ? [] : [[name, next]]
			}),
		)

	return {
		sites: sites.map((site) => ({ ...site, bindings: remappedBindings(site) })),
		declarations: sharedDeclarations,
		imports: sharedImports,
	}
}

/**
 * Splice a demo's extracted facts into its source. Each qualifying Example's
 * open tag gains `__facts={__exampleFacts[k]}`. One module-level const carrying
 * the facts lands at the end of the file. The shared declaration/import tables
 * spread into each per-Example entry. The const is declared at
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
	const out = facts.sites.reduceRight(
		(acc, site, i) =>
			`${acc.slice(0, site.insertAt)} __facts={${FACTS_CONST}[${i}]}${acc.slice(site.insertAt)}`,
		source,
	)

	const shared = JSON.stringify({ declarations: facts.declarations, imports: facts.imports })

	const perExample = facts.sites
		.map(
			(site) =>
				`{ ...__exampleFactsShared, elements: ${JSON.stringify(site.elements)}, bindings: ${JSON.stringify(site.bindings)} }`,
		)
		.join(', ')

	return `${out}\n\n;const __exampleFactsShared = ${shared};\n;const ${FACTS_CONST} = [${perExample}];\n`
}
