import ts from 'typescript'
import { analyzeProps } from './annotation'
import { buildCallable, isCallable } from './callables'
import { extractDefaults } from './defaults'
import { extractDocFromParts, stripLinks } from './doc'
import type { ExtraDefaults } from './extractor'
import { extractProps } from './props'
import type { ComponentApi, ModuleApi, OtherApi, PassThrough, SymbolApi } from './schema'
import { isReactNodeType } from './shape'
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

	/** Absolute path of the documented package. */
	packageDir: string

	/** Consumer-supplied extra prop defaults, keyed per component. */
	extraDefaults: ExtraDefaults
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
 * Route one export symbol to its API shape by what it *is*, not how it is
 * cased. A **component** is a callable whose form renders like one — a JSX
 * return or a props-shaped first parameter — reached as a declared function
 * (unwrapping `forwardRef` / `memo`) or a `const X = factory(…)`; casing only
 * breaks ties, so a lowercase render helper is not mistaken for a component and
 * a PascalCase plain function is not mistaken the other way. Any remaining value
 * export that carries a call signature — a `useX` hook or a plain function —
 * becomes a `CallableApi` modeling its overload signatures; constants, contexts,
 * and plain objects emit `OtherApi` so nothing errors and everything renders.
 */
function classifyExport(symbol: ts.Symbol, context: ModuleContext): SymbolApi | null {
	const name = symbol.getName()

	const target = unaliasSymbol(symbol, context.checker)

	if (!(target.flags & ts.SymbolFlags.Value)) return null

	if (/^[A-Z]/.test(name)) {
		const callable = resolveCallable(target)

		if (callable && isComponentCallable(callable, context.checker)) {
			return buildComponent(name, target, callable, context)
		}

		const factory = resolveFactoryComponent(target, context.checker)

		if (factory) return buildFactoryComponent(name, target, factory, context)
	}

	if (isCallable(target, context.checker)) return buildCallable(name, target, context)

	return buildOther(name, target, context.checker)
}

/** Whether a declared callable's own signature renders like a component. */
function isComponentCallable(callable: FunctionLikeNode, checker: ts.TypeChecker): boolean {
	const signature = checker.getSignatureFromDeclaration(callable)

	return signature ? isComponentSignature(signature, callable, checker) : false
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

/** A factory-made component: the `const X = factory(…)` declaration and its resolved render signature. */
type FactoryComponent = { declaration: ts.VariableDeclaration; signature: ts.Signature }

/**
 * The component form of a `const X = factory(…)` export whose initializer
 * holds no inline function to unwrap: when the declaration's resolved type has
 * a call signature that renders like a component, the export documents as a
 * component with props read from that signature. Generalizes the
 * `forwardRef` / `memo` unwrapping to any call-expression initializer —
 * `createSkeleton(…)`-style factories and `memo(Identifier)` wrappers alike.
 */
function resolveFactoryComponent(
	symbol: ts.Symbol,
	checker: ts.TypeChecker,
): FactoryComponent | null {
	for (const decl of symbol.getDeclarations() ?? []) {
		if (!ts.isVariableDeclaration(decl) || !decl.initializer) continue

		if (!ts.isCallExpression(unwrapInitializer(decl.initializer))) continue

		const type = checker.getTypeOfSymbolAtLocation(symbol, decl)

		for (const signature of type.getCallSignatures()) {
			if (isComponentSignature(signature, decl, checker)) return { declaration: decl, signature }
		}
	}

	return null
}

/** Strip parentheses, `as` casts, and `satisfies` clauses around an initializer. */
function unwrapInitializer(node: ts.Expression): ts.Expression {
	let current = node

	while (
		ts.isParenthesizedExpression(current) ||
		ts.isAsExpression(current) ||
		ts.isSatisfiesExpression(current)
	) {
		current = current.expression
	}

	return current
}

/** Whether a call signature renders like a component: JSX-returning, or first parameter shaped like props. */
function isComponentSignature(
	signature: ts.Signature,
	declaration: ts.Node,
	checker: ts.TypeChecker,
): boolean {
	if (returnsJsx(signature.getReturnType())) return true

	const param = signature.parameters[0]

	if (!param) return false

	return looksLikeProps(checker.getTypeOfSymbolAtLocation(param, declaration))
}

/** Name-based JSX detection on a return type, unrolling `ReactElement | null`-style unions. */
function returnsJsx(type: ts.Type): boolean {
	if (isReactNodeType(type)) return true

	return type.isUnion() && type.types.some((member) => isReactNodeType(member))
}

/** An object-shaped type with named members — what a props parameter looks like. */
function looksLikeProps(type: ts.Type): boolean {
	if (type.isUnion() || type.isIntersection()) return type.types.some(looksLikeProps)

	if (type.getCallSignatures().length > 0) return false

	if (!(type.flags & ts.TypeFlags.Object)) return false

	return type.getProperties().length > 0
}

/** Assemble the `ComponentApi` for a declared component from its function form. */
function buildComponent(
	name: string,
	symbol: ts.Symbol,
	callable: FunctionLikeNode,
	context: ModuleContext,
): ComponentApi {
	const { checker } = context

	const annotation = getPropsAnnotation(callable)

	return assembleComponent(name, symbol, context, {
		location: callable,
		propsType: resolvePropsType(callable, checker),
		defaults: extractDefaults(callable),
		...analyzeProps(callable, annotation, checker),
	})
}

/**
 * Assemble the `ComponentApi` for a factory-made component. With no function
 * body or annotation to inspect, props come from the resolved call signature's
 * first parameter; destructured defaults and pass-through detection have
 * nothing to read, so only kata and `@defaultValue` defaults apply.
 */
function buildFactoryComponent(
	name: string,
	symbol: ts.Symbol,
	factory: FactoryComponent,
	context: ModuleContext,
): ComponentApi {
	const { checker } = context

	const param = factory.signature.parameters[0]

	return assembleComponent(name, symbol, context, {
		location: factory.declaration,
		propsType: param ? checker.getTypeOfSymbolAtLocation(param, factory.declaration) : null,
		projectNames: null,
		defaults: new Map(),
		passThrough: [],
	})
}

/** The per-form inputs {@link assembleComponent} folds into one `ComponentApi`. */
type ComponentParts = {
	/** Node prop types resolve against — the callable, or the factory declaration. */
	location: ts.Node
	propsType: ts.Type | null
	projectNames: ReadonlySet<string> | null
	defaults: ReadonlyMap<string, string>
	passThrough: PassThrough[]
}

/** Shared tail of component assembly: props, docs, and pass-through. */
function assembleComponent(
	name: string,
	symbol: ts.Symbol,
	context: ModuleContext,
	parts: ComponentParts,
): ComponentApi {
	const { checker, packageDir } = context

	const extraDefaults = context.extraDefaults(packageDir, name)

	const props = parts.propsType
		? extractProps(parts.location, parts.propsType, parts.projectNames, {
				checker,
				defaults: parts.defaults,
				extraDefaults,
			})
		: []

	const api: ComponentApi = { kind: 'component', name, props }

	const description = extractDocFromParts(symbol.getDocumentationComment(checker))

	if (description) api.description = description

	if (parts.passThrough.length > 0) api.passThrough = parts.passThrough

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
