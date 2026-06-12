import { ts } from 'ts-morph'

// Snippets follow derive-code's formatting: two-space indent, `…`
// placeholder, 80-column inline budget. Constants stay local so the engine
// doesn't import from the runtime walker.
const INDENT = '  '

const PLACEHOLDER = '…'

const INLINE_BUDGET = 80

/**
 * Derive a per-prop usage snippet: a JSX fragment applying just this prop to
 * the component. Resolution order:
 *
 *   1. An authored `@example` JSDoc tag, verbatim.
 *   2. Function types: an arrow handler with the signature's parameter names.
 *   3. Object (or array-of-object) types declared in project source: a
 *      skeleton literal of the required members.
 *
 * Anything else returns `undefined`: primitives and literal unions are
 * self-describing in the props table.
 */
export function deriveUsage(
	component: string,
	propName: string,
	type: ts.Type,
	symbol: ts.Symbol,
	checker: ts.TypeChecker,
): string | undefined {
	const example = authoredExample(symbol, checker)

	if (example) return example

	const value = functionValue(type) ?? skeletonValue(type, checker)

	if (!value) return undefined

	return renderSnippet(component, propName, value)
}

/** Verbatim body of an `@example` JSDoc tag, dedented. */
function authoredExample(symbol: ts.Symbol, checker: ts.TypeChecker): string | undefined {
	const tag = symbol.getJsDocTags(checker).find((t) => t.name === 'example')

	if (!tag) return undefined

	const text = ts.displayPartsToString(tag.text).trim()

	return text === '' ? undefined : dedent(text)
}

/**
 * `(value, event) => …` for a single-call-signature function type. Overloads
 * and hybrid callable-with-properties types produce nothing, mirroring the
 * guard in `format-type`.
 */
function functionValue(type: ts.Type): string | null {
	const arms = nonUndefinedArms(type)

	const fn = arms.length === 1 ? arms[0] : undefined

	if (!fn) return null

	const signatures = fn.getCallSignatures()

	if (signatures.length !== 1 || fn.getProperties().length > 0) return null

	const sig = signatures[0]

	if (!sig) return null

	const params = sig.getParameters().map((p) => p.getName())

	return `(${params.join(', ')}) => ${PLACEHOLDER}`
}

type Skeleton = { members: [string, string][]; array: boolean }

/**
 * Skeleton literal for an object (or array-of-object) type declared in
 * project source: every required member with a placeholder value. Types with
 * no required members produce nothing; a guessed selection of optional
 * members would misrepresent the contract.
 */
function skeletonValue(type: ts.Type, checker: ts.TypeChecker): Skeleton | null {
	const arms = nonUndefinedArms(type)

	const base = arms.length === 1 ? arms[0] : undefined

	if (!base) return null

	const element = arrayElementType(base, checker)

	const target = element ?? base

	if (!isProjectObjectType(target)) return null

	if (target.getCallSignatures().length > 0) return null

	const members: [string, string][] = []

	for (const member of checker.getPropertiesOfType(target)) {
		if (member.flags & ts.SymbolFlags.Optional) continue

		if (isExternalSymbol(member)) continue

		const decl = member.valueDeclaration ?? member.getDeclarations()?.[0]

		if (!decl) continue

		const memberType = checker.getTypeOfSymbolAtLocation(member, decl)

		members.push([member.getName(), memberValue(memberType, checker)])
	}

	if (members.length === 0) return null

	return { members, array: element !== null }
}

/** Placeholder value for a skeleton member, keyed by its type. */
function memberValue(type: ts.Type, checker: ts.TypeChecker): string {
	const fn = functionValue(type)

	if (fn) return fn

	// `boolean` is internally the union `false | true`; catch it before the
	// first-arm split renders `false`.
	if (type.flags & ts.TypeFlags.Boolean) return 'true'

	// Unions take their first arm's placeholder; `string | number` renders as
	// a string, literal unions as their first literal.
	const arm = nonUndefinedArms(type)[0] ?? type

	if (arm.isStringLiteral()) return `'${arm.value}'`

	if (arm.isNumberLiteral()) return String(arm.value)

	if (arm.flags & ts.TypeFlags.BooleanLiteral) {
		return checker.typeToString(arm)
	}

	if (arm.flags & ts.TypeFlags.StringLike) return `'${PLACEHOLDER}'`

	if (arm.flags & ts.TypeFlags.NumberLike) return '0'

	if (arm.flags & ts.TypeFlags.BooleanLike) return 'true'

	// `ReactNode` accepts a string; show one rather than an opaque mark.
	if ((type.aliasSymbol ?? type.getSymbol())?.getName() === 'ReactNode') {
		return `'${PLACEHOLDER}'`
	}

	return PLACEHOLDER
}

/**
 * Lay out the snippet: fully inline when it fits the budget, then the
 * attribute on its own line, then one skeleton member per line.
 */
function renderSnippet(component: string, propName: string, value: string | Skeleton): string {
	const inlineValue = typeof value === 'string' ? value : inlineSkeleton(value)

	const inline = `<${component} ${propName}={${inlineValue}} />`

	if (inline.length <= INLINE_BUDGET) return inline

	const ownLine = `${INDENT}${propName}={${inlineValue}}`

	const body =
		ownLine.length <= INLINE_BUDGET || typeof value === 'string'
			? ownLine
			: expandedSkeleton(propName, value)

	return `<${component}\n${body}\n/>`
}

function inlineSkeleton({ members, array }: Skeleton): string {
	const obj = `{ ${members.map(([name, value]) => `${name}: ${value}`).join(', ')} }`

	return array ? `[${obj}]` : obj
}

function expandedSkeleton(propName: string, { members, array }: Skeleton): string {
	const memberIndent = INDENT.repeat(array ? 3 : 2)

	const lines = members.map(([name, value]) => `${memberIndent}${name}: ${value},`)

	const obj = `{\n${lines.join('\n')}\n${INDENT.repeat(array ? 2 : 1)}}`

	const wrapped = array ? `[\n${INDENT.repeat(2)}${obj},\n${INDENT}]` : obj

	return `${INDENT}${propName}={${wrapped}}`
}

/** Union arms minus `undefined` (optional props carry one); a non-union is its own single arm. */
function nonUndefinedArms(type: ts.Type): ts.Type[] {
	if (!type.isUnion()) return [type]

	return type.types.filter((t) => !(t.flags & ts.TypeFlags.Undefined))
}

/** Element type of `Array<T>` / `ReadonlyArray<T>` references; `null` otherwise. */
function arrayElementType(type: ts.Type, checker: ts.TypeChecker): ts.Type | null {
	if (!(type.flags & ts.TypeFlags.Object)) return null

	if (!((type as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference)) return null

	const name = type.getSymbol()?.getName()

	if (name !== 'Array' && name !== 'ReadonlyArray') return null

	return checker.getTypeArguments(type as ts.TypeReference)[0] ?? null
}

/**
 * Object types whose identity lives in project source. Library shapes
 * (`CSSProperties`, `Set`, React typings) are opaque to skeleton generation;
 * the pass-through and reference panels cover them.
 */
function isProjectObjectType(type: ts.Type): boolean {
	if (!(type.flags & ts.TypeFlags.Object)) return false

	const symbol = type.aliasSymbol ?? type.getSymbol()

	const declarations = symbol?.getDeclarations() ?? []

	if (declarations.length === 0) return false

	return declarations.some((decl) => !decl.getSourceFile().fileName.includes('/node_modules/'))
}

/** True when every declaration site sits under `node_modules`. */
function isExternalSymbol(symbol: ts.Symbol): boolean {
	const declarations = symbol.getDeclarations() ?? []

	if (declarations.length === 0) return false

	return declarations.every((decl) => decl.getSourceFile().fileName.includes('/node_modules/'))
}

/** Strips common leading indentation, anchoring an `@example` body at column 0. */
function dedent(text: string): string {
	const lines = text.split('\n')

	if (lines.length <= 1) return text

	let minIndent = Number.POSITIVE_INFINITY

	for (let i = 1; i < lines.length; i++) {
		const line = lines[i]

		if (!line || line.trim().length === 0) continue

		const indent = line.match(/^[ \t]*/)?.[0].length ?? 0

		if (indent < minIndent) minIndent = indent
	}

	if (minIndent === Number.POSITIVE_INFINITY || minIndent === 0) return text

	return lines.map((line, i) => (i === 0 ? line : line.slice(minIndent))).join('\n')
}
