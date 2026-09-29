import fs from 'node:fs'
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
import { parseSource, referencedNames } from './ts-source'

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
 * The names that a source uses come from its syntax tree (`referencedNames`),
 * and ship beside it, so the runtime reads no source text for names.
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

/** The array methods whose callback renders one element for each item. */
const MAP_METHODS = new Set(['map', 'flatMap'])

/**
 * The elements that a callback returns: its concise body, or the expression of
 * each of its own `return` statements. The search reads through parentheses, a
 * condition, the right side of a logical choice, and a fragment.
 */
function returnedElements(fn: ts.ArrowFunction | ts.FunctionExpression): ts.Node[] {
	const found: ts.Node[] = []

	const take = (expr: ts.Expression | undefined): void => {
		if (!expr) return

		if (
			ts.isParenthesizedExpression(expr) ||
			ts.isAsExpression(expr) ||
			ts.isSatisfiesExpression(expr) ||
			ts.isNonNullExpression(expr)
		) {
			take(expr.expression)
		} else if (ts.isConditionalExpression(expr)) {
			take(expr.whenTrue)

			take(expr.whenFalse)
		} else if (ts.isBinaryExpression(expr)) {
			take(expr.right)
		} else if (ts.isJsxElement(expr) || ts.isJsxSelfClosingElement(expr)) {
			found.push(expr)
		} else if (ts.isJsxFragment(expr)) {
			for (const child of expr.children) {
				if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) found.push(child)
			}
		}
	}

	const visit = (node: ts.Node): void => {
		if (ts.isFunctionLike(node)) return

		if (ts.isReturnStatement(node)) take(node.expression)

		ts.forEachChild(node, visit)
	}

	if (ts.isBlock(fn.body)) ts.forEachChild(fn.body, visit)
	else take(fn.body)

	return found
}

/**
 * The JSX expression child that holds `node`. Undefined when `node` sits in an
 * attribute, or in a function or an element inside the expression, first.
 */
function jsxChildOf(node: ts.Node): ts.JsxExpression | undefined {
	for (let current = node.parent; current; current = current.parent) {
		if (ts.isJsxExpression(current)) {
			return ts.isJsxAttribute(current.parent) ? undefined : current
		}

		if (ts.isFunctionLike(current) || ts.isJsxElement(current) || ts.isJsxFragment(current)) {
			return undefined
		}
	}

	return undefined
}

/** The map that an element renders from, as the facts record it. */
type MapSource = { source: string; local: boolean }

/**
 * Returns the source text of an expression, and records the names that it uses
 * under that text.
 */
type RecordSource = (expr: ts.Expression) => string

/**
 * The map of each element that a `.map` or a `.flatMap` callback in the JSX
 * returns. Its source is the whole JSX expression child that holds the call.
 * `local` marks a source that uses a name of an enclosing callback, as an
 * inner map over the item of an outer one does.
 */
function mapsOf(
	children: readonly ts.Node[],
	locals: Set<string>,
	record: RecordSource,
): Map<ts.Node, MapSource> {
	const maps = new Map<ts.Node, MapSource>()

	const visit = (node: ts.Node): void => {
		if (
			ts.isCallExpression(node) &&
			ts.isPropertyAccessExpression(node.expression) &&
			MAP_METHODS.has(node.expression.name.text)
		) {
			const [callback] = node.arguments

			const holder = jsxChildOf(node)?.expression

			if (
				holder &&
				callback &&
				(ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))
			) {
				const map: MapSource = {
					source: record(holder),
					local: locals.size > 0 && usesAny(holder, locals),
				}

				for (const element of returnedElements(callback)) maps.set(element, map)
			}
		}

		ts.forEachChild(node, visit)
	}

	for (const child of children) visit(child)

	return maps
}

/**
 * The expression props of an element, as source text, and the keys among them
 * whose source uses a name of `locals`.
 */
function propFacts(
	node: ts.JsxElement | ts.JsxSelfClosingElement,
	locals: Set<string>,
	record: RecordSource,
) {
	const props: Record<string, string> = {}

	const local: string[] = []

	for (const attr of attributesOf(node).properties) {
		if (!ts.isJsxAttribute(attr) || !ts.isIdentifier(attr.name)) continue

		const key = attr.name.text

		if (IGNORED_PROPS.has(key)) continue

		const init = attr.initializer

		if (!init || ts.isStringLiteral(init)) continue

		if (!ts.isJsxExpression(init) || !init.expression) continue

		if (isRuntimeRecoverable(init.expression)) continue

		props[key] = record(init.expression)

		if (locals.size > 0 && usesAny(init.expression, locals)) local.push(key)
	}

	return { props, local }
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
 * `sources` maps each recorded source to the names that it uses. The names
 * start the declaration closure, and the runtime reads them when it prints the
 * source.
 */
function collectElementFacts(
	children: readonly ts.Node[],
	sf: ts.SourceFile,
): { elements: ElementFact[]; sources: Map<string, Set<string>> } {
	const facts: ElementFact[] = []

	const sources = new Map<string, Set<string>>()

	// Two sources with one text use the same names, so the text keys them.
	const record: RecordSource = (expr) => {
		const text = expr.getText(sf)

		if (!sources.has(text)) sources.set(text, referencedNames(expr))

		return text
	}

	const locals = localNames(children)

	const maps = mapsOf(children, locals, record)

	const visit = (node: ts.Node): void => {
		if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
			const name = tagNameOf(node)

			if (name === EXAMPLE_TAG) return

			if (name) {
				const { props, local } = propFacts(node, locals, record)

				const renderProp = ts.isJsxElement(node) ? renderPropChild(node) : null

				if (renderProp && locals.size > 0 && usesAny(renderProp, locals)) local.push('children')

				const map = maps.get(node)

				facts.push({
					name,
					props,
					...(local.length > 0 ? { local } : {}),
					...(renderProp ? { children: record(renderProp) } : {}),
					...(map ? { map: map.source, ...(map.local ? { mapLocal: true } : {}) } : {}),
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

	return { elements: facts.filter(({ name }) => withFacts.has(name)), sources }
}

// ---------------------------------------------------------------------------
// Declarations and bindings
// ---------------------------------------------------------------------------

/** A declaration of the table, with every name that it uses. */
type Declaration = Omit<DeclarationFact, 'uses'> & { index: number; uses: Set<string> }

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
 * Every name that an import of the file binds: a named, default, or namespace
 * binding, of a value or of a type.
 */
function importedNames(sf: ts.SourceFile): string[] {
	return sf.statements.flatMap((stmt) => {
		const clause = ts.isImportDeclaration(stmt) ? stmt.importClause : undefined

		if (!clause) return []

		const bindings = clause.namedBindings

		const named = !bindings
			? []
			: ts.isNamespaceImport(bindings)
				? [bindings.name.text]
				: bindings.elements.map((spec) => spec.name.text)

		return clause.name ? [clause.name.text, ...named] : named
	})
}

/**
 * Whether a relative specifier names a data module in the demo's own folder,
 * such as `./data` for `data.ts`. A reader keeps such a file beside the code,
 * so the import line stays as the demo writes it. A sibling demo page is a
 * `.tsx` file, whose helpers print from their own snippets.
 */
function isDataBeside(specifier: string, resolved: string): boolean {
	return /^\.\/[^/]+$/.test(specifier) && fs.existsSync(`${resolved}.ts`)
}

/**
 * The identifiers a demo imports and where a reader would import them from:
 * relative specifiers map onto public library modules, bare specifiers stay
 * external, and a data module beside the demo keeps its authored specifier.
 * A type-only specifier carries `type`, so its line reads `type Name`. A
 * default binding carries `default`, so its line reads `import Name from`, as
 * `import countiesUrl from 'us-atlas/counties-10m.json?url'` does. Aliased
 * specifiers are skipped, because an emitted import line would misname them.
 * A namespace import (`import * as X`) is skipped too.
 */
export function importFacts(
	sf: ts.SourceFile,
	{ filePath, srcDir }: SourceFactsOptions,
): Record<string, ImportFact> {
	const facts: Record<string, ImportFact> = {}

	for (const stmt of sf.statements) {
		if (!ts.isImportDeclaration(stmt) || !ts.isStringLiteral(stmt.moduleSpecifier)) continue

		const clause = stmt.importClause

		if (!clause) continue

		const specifier = stmt.moduleSpecifier.text

		const isRelative = specifier.startsWith('.')

		const resolved = path.resolve(path.dirname(filePath), specifier)

		const library = isRelative ? publicModuleFor(resolved, srcDir) : null

		const fact: ImportFact | null = library
			? { module: library }
			: !isRelative || isDataBeside(specifier, resolved)
				? { module: specifier, external: true }
				: null

		if (!fact) continue

		const typeOnly = clause.isTypeOnly

		if (clause.name) {
			facts[clause.name.text] = { ...fact, default: true, ...(typeOnly ? { type: true } : {}) }
		}

		const bindings = clause.namedBindings

		if (!bindings || !ts.isNamedImports(bindings)) continue

		for (const spec of bindings.elements) {
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
	uses: Record<string, string[]>
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

	// Each recorded source, across the sites, with the names that it uses.
	const sources = new Map<string, Set<string>>()

	// Every name that a recorded source uses, across the sites.
	const needed = new Set<string>()

	for (const example of examples) {
		const attrs = example.openingElement.attributes.properties

		const hasCode = attrs.some(
			(attr) => ts.isJsxAttribute(attr) && ts.isIdentifier(attr.name) && attr.name.text === 'code',
		)

		if (hasCode) continue

		const { elements, sources: siteSources } = collectElementFacts(meaningfulChildren(example), sf)

		for (const [text, names] of siteSources) {
			sources.set(text, names)

			for (const name of names) needed.add(name)
		}

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

	// The runtime resolves a name through a shipped declaration or an import of
	// the file. Any other name, such as a global or a callback parameter, stays
	// out of the shipped lists.
	const resolvable = new Set([...importedNames(sf), ...kept.flatMap(({ names }) => names)])

	const resolved = (names: Set<string>) => [...names].filter((name) => resolvable.has(name))

	const sharedDeclarations: DeclarationFact[] = kept.map(({ names, code, uses }) => ({
		names,
		code,
		uses: resolved(uses),
	}))

	// Imports prune the same way: only names that the shipped sources use.
	const sharedImports = Object.fromEntries(
		Object.entries(imports).filter(([name]) => needed.has(name)),
	)

	// A source that uses no resolvable name has no entry.
	const sharedUses = Object.fromEntries(
		[...sources].flatMap(([text, names]): [string, string[]][] => {
			const used = resolved(names)

			return used.length > 0 ? [[text, used]] : []
		}),
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
		uses: sharedUses,
	}
}

/**
 * Splice a demo's extracted facts into its source. Each qualifying Example's
 * open tag gains `__facts={__exampleFacts[k]}`. One module-level const carrying
 * the facts lands at the end of the file. The shared declaration, import, and
 * uses tables spread into each per-Example entry. The const is declared at
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

	const shared = JSON.stringify({
		declarations: facts.declarations,
		imports: facts.imports,
		uses: facts.uses,
	})

	const perExample = facts.sites
		.map(
			(site) =>
				`{ ...__exampleFactsShared, elements: ${JSON.stringify(site.elements)}, bindings: ${JSON.stringify(site.bindings)} }`,
		)
		.join(', ')

	return `${out}\n\n;const __exampleFactsShared = ${shared};\n;const ${FACTS_CONST} = [${perExample}];\n`
}
