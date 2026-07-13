import ts from 'typescript'
import type { ModuleContext } from './components'
import { literalInitializerText } from './defaults'
import { extractDocFromParts, stripLinks } from './doc'
import { formatPropType, formatType } from './format-type'
import { extractReferences } from './references'
import type { CallableApi, ParamApi, SignatureApi } from './schema'
import { classifyType } from './shape'

/**
 * Model a hook or plain function export as a {@link CallableApi}. `kind` is
 * `'hook'` for a `use[A-Z]…` name and `'function'` otherwise. Every overload
 * the checker exposes becomes one {@link SignatureApi}; TS omits the merged
 * implementation signature from `getCallSignatures()`, so an N-overload function
 * emits exactly N entries. The summary comes from the symbol's TSDoc, read the
 * same way component summaries are.
 */
export function buildCallable(
	name: string,
	symbol: ts.Symbol,
	context: ModuleContext,
): CallableApi {
	const { checker } = context

	const kind = /^use[A-Z]/.test(name) ? 'hook' : 'function'

	const location = declarationOf(symbol)

	const tags = symbol.getJsDocTags(checker)

	const paramDescs = paramDescriptions(tags)

	const returnsDesc = returnsDescription(tags)

	const signatures = location
		? callSignaturesOf(symbol, checker).map((sig) =>
				buildSignature(sig, location, paramDescs, returnsDesc, context),
			)
		: []

	const api: CallableApi = { kind, name, signatures }

	const description = extractDocFromParts(symbol.getDocumentationComment(checker))

	if (description) api.description = description

	return api
}

/** Whether a value symbol resolves to a callable — a hook or function, rather than a constant or object. */
export function isCallable(symbol: ts.Symbol, checker: ts.TypeChecker): boolean {
	return callSignaturesOf(symbol, checker).length > 0
}

/** Overload signatures of the symbol's resolved type; the implementation signature is already excluded. */
function callSignaturesOf(symbol: ts.Symbol, checker: ts.TypeChecker): readonly ts.Signature[] {
	const decl = declarationOf(symbol)

	if (!decl) return []

	return checker.getTypeOfSymbolAtLocation(symbol, decl).getCallSignatures()
}

/** The symbol's value declaration, falling back to its first declaration. */
function declarationOf(symbol: ts.Symbol): ts.Declaration | undefined {
	return symbol.valueDeclaration ?? symbol.getDeclarations()?.[0]
}

/** Assemble one overload: its type parameters, parameters, and return contract. */
function buildSignature(
	sig: ts.Signature,
	location: ts.Node,
	paramDescs: ReadonlyMap<string, string>,
	returnsDesc: string | undefined,
	context: ModuleContext,
): SignatureApi {
	const { checker } = context

	const params = sig.parameters.map((param, index) =>
		buildParam(param, index, location, paramDescs, context),
	)

	const signature: SignatureApi = {
		params,
		returns: buildReturns(sig, location, returnsDesc, context),
	}

	const typeParams = sig.typeParameters?.map(
		(tp) => tp.getSymbol()?.getName() ?? checker.typeToString(tp),
	)

	if (typeParams && typeParams.length > 0) signature.typeParams = typeParams

	return signature
}

/** Render the return type, attaching its `@returns` prose and any named-type references. */
function buildReturns(
	sig: ts.Signature,
	location: ts.Node,
	description: string | undefined,
	context: ModuleContext,
): SignatureApi['returns'] {
	const { checker } = context

	const type = formatType(sig.getReturnType(), checker, location)

	const returns: SignatureApi['returns'] = { type }

	if (description) returns.description = description

	const references = extractReferences(type, location, checker)

	if (references) returns.references = references

	return returns
}

/** Model one parameter: display type, checker shape, optionality, default, and `@param` prose. */
function buildParam(
	symbol: ts.Symbol,
	index: number,
	location: ts.Node,
	paramDescs: ReadonlyMap<string, string>,
	context: ModuleContext,
): ParamApi {
	const { checker } = context

	const decl = symbol.valueDeclaration

	const paramType = checker.getTypeOfSymbolAtLocation(symbol, decl ?? location)

	const name = paramName(symbol, index, paramType, decl)

	const param: ParamApi = {
		name,
		type: formatPropType(paramType, checker, location),
		shape: classifyType(paramType, checker),
	}

	if (isOptionalParam(symbol, decl, checker)) param.optional = true

	const def = paramDefault(decl)

	if (def) param.default = def

	const description = paramDescs.get(name)

	if (description) param.description = description

	return param
}

/**
 * The parameter's source name. A destructured binding pattern carries none, so
 * the name is synthesized from the contextual type's alias or interface name,
 * decapitalized to a readable camelCase identifier (`ControllableOptions` →
 * `controllableOptions`); an anonymous inline object falls back to `arg{n}`.
 */
function paramName(
	symbol: ts.Symbol,
	index: number,
	paramType: ts.Type,
	decl: ts.Declaration | undefined,
): string {
	if (decl && ts.isParameter(decl)) {
		if (ts.isIdentifier(decl.name)) return decl.name.text

		const typeName = aliasOrSymbolName(paramType)

		return typeName ? decapitalize(typeName) : `arg${index}`
	}

	const raw = symbol.getName()

	return raw && !raw.startsWith('__') ? raw : `arg${index}`
}

/** Named alias or interface identity of a type — PascalCase only, so synthetic `__type` names are skipped. */
function aliasOrSymbolName(type: ts.Type): string | undefined {
	const alias = type.aliasSymbol?.getName()

	if (alias && /^[A-Z]/.test(alias)) return alias

	const symbol = type.getSymbol()?.getName()

	return symbol && /^[A-Z]/.test(symbol) ? symbol : undefined
}

/** Lowercase the first character, turning a type name into a readable identifier. */
function decapitalize(text: string): string {
	return text.charAt(0).toLowerCase() + text.slice(1)
}

/**
 * Whether a parameter may be omitted at the call site: an explicit `?`, a
 * default initializer, or a rest element, backed by the checker's own judgment
 * and the symbol's optional flag.
 */
function isOptionalParam(
	symbol: ts.Symbol,
	decl: ts.Declaration | undefined,
	checker: ts.TypeChecker,
): boolean {
	if (decl && ts.isParameter(decl)) {
		if (decl.questionToken || decl.initializer || decl.dotDotDotToken) return true

		if (checker.isOptionalParameter(decl)) return true
	}

	return !!(symbol.flags & ts.SymbolFlags.Optional)
}

/** The parameter's default value when it reads as a simple literal; omitted otherwise. */
function paramDefault(decl: ts.Declaration | undefined): string | undefined {
	if (!decl || !ts.isParameter(decl) || !decl.initializer) return undefined

	return literalInitializerText(decl.initializer) ?? undefined
}

/** Map each `@param name` tag to its description, keyed by the documented parameter name. */
function paramDescriptions(tags: readonly ts.JSDocTagInfo[]): Map<string, string> {
	const out = new Map<string, string>()

	for (const tag of tags) {
		if (tag.name !== 'param' || !tag.text) continue

		const nameIndex = tag.text.findIndex((part) => part.kind === 'parameterName')

		if (nameIndex >= 0) {
			const name = tag.text[nameIndex]?.text.trim()

			const desc = cleanTagText(ts.displayPartsToString(tag.text.slice(nameIndex + 1)))

			if (name && desc) out.set(name, desc)

			continue
		}

		// Older shape: the whole tag collapses to one text part, `name description`.
		const joined = ts.displayPartsToString(tag.text).trim()

		const space = joined.search(/\s/)

		if (space < 0) continue

		const desc = cleanTagText(joined.slice(space + 1))

		if (desc) out.set(joined.slice(0, space), desc)
	}

	return out
}

/** Prose of the first `@returns` tag, or undefined when the callable documents none. */
function returnsDescription(tags: readonly ts.JSDocTagInfo[]): string | undefined {
	for (const tag of tags) {
		if (tag.name !== 'returns' && tag.name !== 'return') continue

		const desc = cleanTagText(ts.displayPartsToString(tag.text ?? []))

		if (desc) return desc
	}

	return undefined
}

/** Flatten `{@link}` tokens and drop the TSDoc `- ` lead-in a tag description may carry. */
function cleanTagText(text: string): string {
	return stripLinks(text)
		.replace(/^\s*-\s*/, '')
		.trim()
}
