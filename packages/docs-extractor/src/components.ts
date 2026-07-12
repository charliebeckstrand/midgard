import ts from 'typescript'
import { extractDefaults } from './defaults'
import { extractDocFromParts, type LinkResolver, stripLinks } from './doc'
import { readKataDefaults } from './kata-defaults'
import { extractPassThrough } from './passthrough'
import { extractProjectPropNames } from './project-props'
import { extractProps } from './props'
import type { ComponentApi, ModuleApi, OtherApi, SymbolApi } from './schema'
import {
	type FunctionLikeNode,
	getPropsAnnotation,
	unaliasSymbol,
	unwrapFunctionLike,
} from './ts-utils'

/** Everything module extraction needs beyond the specifier itself. */
export type ModuleContext = {
	program: ts.Program
	checker: ts.TypeChecker
	resolveLink: LinkResolver

	/** Absolute path of the documented package, for kata lookups. */
	packageDir: string
}

/**
 * Extract every documented export of one entry point. Walks the barrel's
 * module symbol via `getExportsOfModule`, so `export * from` re-exports and
 * aliased specifiers resolve the same way an importer sees them; type-only
 * exports are skipped entirely.
 */
export function extractModule(
	specifier: string,
	entryPath: string,
	context: ModuleContext,
): ModuleApi {
	const sourceFile = context.program.getSourceFile(entryPath)

	const moduleSymbol = sourceFile && context.checker.getSymbolAtLocation(sourceFile)

	if (!moduleSymbol) return { specifier, exports: [] }

	const exports: SymbolApi[] = []

	for (const symbol of context.checker.getExportsOfModule(moduleSymbol)) {
		const api = classifyExport(symbol, context)

		if (api) exports.push(api)
	}

	return { specifier, exports }
}

/**
 * Route one export symbol to its API shape. PascalCase value exports that
 * resolve to a callable (unwrapping `forwardRef` / `memo`) become components;
 * every other value export — camelCase functions, hooks, constants — emits
 * `OtherApi` so nothing errors and everything renders. Callables route to
 * `OtherApi` until the callables pass lands and models their signatures.
 */
function classifyExport(symbol: ts.Symbol, context: ModuleContext): SymbolApi | null {
	const name = symbol.getName()

	const target = unaliasSymbol(symbol, context.checker)

	if (!(target.flags & ts.SymbolFlags.Value)) return null

	if (/^[A-Z]/.test(name)) {
		const callable = resolveCallable(target)

		if (callable) return buildComponent(name, target, callable, context)
	}

	return buildOther(name, target, context.checker)
}

/** The component's function form: a declaration, or a variable initializer unwrapped through wrappers. */
function resolveCallable(symbol: ts.Symbol): FunctionLikeNode | null {
	for (const decl of symbol.getDeclarations() ?? []) {
		if (ts.isFunctionDeclaration(decl)) return decl

		if (ts.isVariableDeclaration(decl) && decl.initializer) {
			const fn = unwrapFunctionLike(decl.initializer)

			if (fn) return fn
		}
	}

	return null
}

/** Assemble the `ComponentApi` for one component from the focused extractors. */
function buildComponent(
	name: string,
	symbol: ts.Symbol,
	callable: FunctionLikeNode,
	context: ModuleContext,
): ComponentApi {
	const { checker, resolveLink, packageDir } = context

	const annotation = getPropsAnnotation(callable)

	const propsType = resolvePropsType(callable, checker)

	const passThrough = extractPassThrough(callable, annotation, checker)

	const projectNames = annotation ? extractProjectPropNames(annotation, checker) : null

	const defaults = extractDefaults(callable)

	const variantDefaults = readKataDefaults(packageDir, kebabCase(name))

	const props = propsType
		? extractProps(callable, propsType, projectNames, {
				checker,
				resolveLink,
				defaults,
				variantDefaults,
			})
		: []

	const api: ComponentApi = { kind: 'component', name, props }

	const { description, links } = extractDocFromParts(
		symbol.getDocumentationComment(checker),
		resolveLink,
	)

	if (description) api.description = description

	if (links) api.links = links

	if (passThrough.length > 0) api.passThrough = passThrough

	if (Object.keys(variantDefaults).length > 0) api.variantDefaults = variantDefaults

	return api
}

/** The catch-all shape for value exports the extractor recognizes but does not model. */
function buildOther(name: string, symbol: ts.Symbol, checker: ts.TypeChecker): OtherApi {
	const api: OtherApi = { kind: 'other', name }

	const description = stripLinks(
		ts.displayPartsToString(symbol.getDocumentationComment(checker)),
	).trim()

	if (description) api.description = description

	return api
}

/** The checker-resolved type of the callable's first parameter — the props surface. */
function resolvePropsType(callable: FunctionLikeNode, checker: ts.TypeChecker): ts.Type | null {
	const type = checker.getTypeAtLocation(callable)

	const sig = type.getCallSignatures()[0]

	const param = sig?.parameters[0]

	if (!param) return null

	return checker.getTypeOfSymbolAtLocation(param, callable)
}

/** `CommandPalette` → `command-palette`, matching kata file naming. */
function kebabCase(name: string): string {
	return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}
