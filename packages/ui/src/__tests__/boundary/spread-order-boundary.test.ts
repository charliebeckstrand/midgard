import {
	type Expression,
	isAsExpression,
	isIdentifier,
	isJsxOpeningElement,
	isJsxSelfClosingElement,
	isJsxSpreadAttribute,
	isNonNullExpression,
	isObjectBindingPattern,
	isParenthesizedExpression,
	isSatisfiesExpression,
	isStringLiteral,
	isTypeAliasDeclaration,
	isTypeReferenceNode,
	isVariableDeclaration,
	type Node,
	type ObjectBindingPattern,
	type ParameterDeclaration,
	type SourceFile,
	type TypeNode,
} from 'typescript/unstable/ast'
import { afterAll, describe, expect, it } from 'vitest'
import { isFunctionLike } from '../helpers/ts-ast'
import { startTypeScript, type TypeScriptServer } from '../helpers/ts-server'
import { docsSites, isSourceFile, srcDir, srcRelative, walkSource } from '../helpers/walk-source'

// Spread-order boundary. CONVENTIONS.md §3.9 decides what a consumer may
// override by where an attribute sits relative to `{...props}`. The rule has
// three parts — the load-bearing attributes, the `data-slot` anchor, and the
// internal `ref` — and §3.9 states each. This suite holds them; it does not
// restate them.
//
// The `ref` part needs to know whether the consumer spread can still carry a
// `ref`. A component that destructures `ref` from its props has taken it out of
// the spread, so the scan reads the parameter patterns of the enclosing
// functions.
//
// The anchor half needs the set of anchors the library selects on. The scan
// computes that set from every `[data-slot=…]` selector in the shipped tree,
// so it cannot drift. It skips `docs`, because the demo tree is a consumer
// root: a demo query must not make an anchor load-bearing.
//
// `type` on the input family stays out of scope. §3.9 names `type` for the
// form-submit hazard, which is a button concern, so `type="password"` on a CVV
// field is a legitimate override.

const SCAN_ROOTS = ['components', 'primitives', 'layouts', 'structure', 'modules']

// The spread a consumer's props arrive through: `props`, `rest`, or a rest
// binding of the props under another name (`{ value, ...labelProps }`). An
// internal bag (`{...triggerProps}`) is resolved wiring, not consumer input.
const CONSUMER_SPREAD = /^(?:props|rest)$/

// §4.3 makes `ComponentProps<'tag'>` the only native-prop base, so a props type
// that names it admits native attributes, and one that omits `'ref'` from it
// carries no ref.
const NATIVE_BASE = /\bComponentProps</

const REF_OMITTED = /Omit<\s*ComponentProps<[^>]*>\s*,[^>]*'ref'/

// The element-agnostic base of a component with two elements (§4.3) carries no ref.
const AGNOSTIC_BASE = /\bHTMLAttributes<HTMLElement>/

/**
 * A rest binding of the props of an enclosing function. `native` is true when
 * the props type admits native attributes, so the rest can carry a consumer
 * `role`, `data-slot`, or `ref`. `refTaken` is true when the same pattern binds
 * `ref`, or when the props type omits it.
 */
type RestBinding = { name: string; native: boolean; refTaken: boolean }

/**
 * The expression under its parentheses and casts. A cast changes the type of a
 * spread, not the keys it carries, so `{...(props as T)}` is a consumer spread.
 */
function uncast(node: Expression): Expression {
	return isParenthesizedExpression(node) ||
		isAsExpression(node) ||
		isSatisfiesExpression(node) ||
		isNonNullExpression(node)
		? uncast(node.expression)
		: node
}

const LOAD_BEARING =
	/^(?:role|tabIndex|aria-(?:checked|selected|expanded|pressed|current|orientation|disabled|invalid|required|multiselectable|activedescendant))$/

// Hosts that put a real `<button>` in the DOM, where a stray `type` submits
// the enclosing form.
const BUTTON_HOST = /^(?:button|Button|ToggleIconButton|Element|Polymorphic\w*)$/

/** A rule this file does not hold yet, and how many violations it still has. */
type Waiver = { order?: number; anchor?: number; ref?: number; note: string }

/**
 * Files a rule does not hold yet, pinned to the violation count each one
 * covers.
 *
 * @remarks
 * Every entry is backlog, not exemption: `note` names the audit row or lead
 * that owns it, and the step that closes the row deletes the entry. The count
 * is what makes the waiver narrow — a file-wide waiver would absorb a new
 * violation in an already-waived file, and the pin test fails the moment a
 * count moves in either direction.
 */
const WAIVERS = new Map<string, Waiver>([])

/** One JSX attribute written before the consumer spread. */
type Attribute = { name: string; value?: string }

/**
 * One JSX element that takes a consumer spread, and the attributes on each side
 * of it. `refTaken` is true when an enclosing function destructures `ref` from
 * its props, so the spread cannot carry one.
 */
type Site = {
	file: string
	line: number
	tag: string
	before: Attribute[]
	after: Attribute[]
	refTaken: boolean
}

/** The rules this suite holds, and the keys a waiver pins a count against. */
const RULES = ['order', 'anchor', 'ref'] as const

/** One rule's complaint about one attribute. */
type Violation = { file: string; rule: (typeof RULES)[number]; text: string }

/**
 * The attributes written before the consumer spread, for every JSX element in
 * one file that takes one. An element with no consumer spread is skipped,
 * because §3.9 speaks only about the two sides of that spread.
 *
 * @param file - The path that a site reports.
 * @param parsed - The parse of the file, in the TSX grammar.
 */
function sitesIn(file: string, parsed: SourceFile): Site[] {
	const sites: Site[] = []

	// A JSX name can be an identifier or a namespaced name, so read it from the
	// source. `getStart` skips the leading trivia that `pos` includes: without
	// it, an attribute below a comment reads as the comment plus its own name.
	const text = (node: Node) => parsed.text.slice(node.getStart(), node.end)

	// How many enclosing functions destructure `ref` from their first parameter.
	let refTakers = 0

	// The rest bindings of the props of the enclosing functions, innermost last.
	const rests: RestBinding[] = []

	// The props parameter of each enclosing function, innermost last, so a rest
	// that the body destructures from it reads the type of the parameter.
	const propsParams: (ParameterDeclaration | undefined)[] = []

	const visit = (node: Node): void => {
		const takesRef = isFunctionLike(node) && destructuresRef(node.parameters[0])

		if (takesRef) refTakers += 1

		const scope = isFunctionLike(node)

		if (scope) propsParams.push(node.parameters[0])

		const pushed = rests.length

		if (scope && node.parameters[0]) {
			const parameter = node.parameters[0]

			if (isObjectBindingPattern(parameter.name)) {
				const rest = restOf(parameter.name, parameter.type, parsed)

				if (rest) rests.push(rest)
			}
		}

		// `const { ref, ...rest } = props` in the body reads the type of `props`.
		if (isVariableDeclaration(node) && isObjectBindingPattern(node.name) && node.initializer) {
			const parameter = propsParams.at(-1)

			const source = text(node.initializer)

			// A destructure with its own type reads that type.
			if (node.type) {
				const rest = restOf(node.name, node.type, parsed)

				if (rest) rests.push(rest)
			} else if (parameter && isIdentifier(parameter.name) && parameter.name.text === source) {
				const rest = restOf(node.name, parameter.type, parsed)

				if (rest) rests.push(rest)
			}
		}

		/** The binding of a spread name, innermost first. */
		const bindingOf = (name: string) => rests.findLast((rest) => rest.name === name)

		if (isJsxOpeningElement(node) || isJsxSelfClosingElement(node)) {
			const before: Attribute[] = []

			const after: Attribute[] = []

			// The first consumer spread splits the attributes; a later spread does not.
			let split = false

			let spreadRefTaken = false

			for (const property of node.attributes.properties) {
				if (!isJsxSpreadAttribute(property)) {
					;(split ? after : before).push({
						name: text(property.name),
						value:
							property.initializer && isStringLiteral(property.initializer)
								? property.initializer.text
								: undefined,
					})

					continue
				}

				if (split) continue

				const name = text(uncast(property.expression))

				const binding = bindingOf(name)

				// `props` and `rest` stay consumer spreads under any type, as before.
				if (CONSUMER_SPREAD.test(name) || binding?.native) {
					split = true

					spreadRefTaken = refTakers > 0 || Boolean(binding?.refTaken)
				}
			}

			if (split) {
				sites.push({
					file,
					line: parsed.getLineAndCharacterOfPosition(node.tagName.getStart()).line + 1,
					tag: text(node.tagName),
					before,
					after,
					refTaken: spreadRefTaken,
				})
			}
		}

		node.forEachChild(visit)

		if (takesRef) refTakers -= 1

		if (scope) propsParams.pop()

		// A function scope drops the rests of its parameter and of its body.
		if (scope) rests.length = pushed
	}

	visit(parsed)

	return sites
}

/**
 * The rest binding of an object pattern over props of `type`, if the pattern
 * has one. A type reference reads the alias of that name in the same file, so
 * `{ ...labelProps }: KanbanProps<T>` reads `type KanbanProps<T> = …`.
 */
function restOf(
	pattern: ObjectBindingPattern,
	type: TypeNode | undefined,
	parsed: SourceFile,
): RestBinding | undefined {
	const rest = pattern.elements.find((element) => element.dotDotDotToken)

	if (rest?.name === undefined || !isIdentifier(rest.name)) return undefined

	const shape = typeText(type, parsed)

	return {
		name: rest.name.text,
		native: NATIVE_BASE.test(shape),
		refTaken: bindsRef(pattern) || REF_OMITTED.test(shape) || AGNOSTIC_BASE.test(shape),
	}
}

/** The text of a props type, through one alias declared in the same file. */
function typeText(type: TypeNode | undefined, parsed: SourceFile): string {
	if (!type) return ''

	if (isTypeReferenceNode(type) && isIdentifier(type.typeName)) {
		const name = type.typeName.text

		for (const statement of parsed.statements) {
			if (isTypeAliasDeclaration(statement) && statement.name.text === name) {
				return parsed.text.slice(statement.type.getStart(), statement.type.end)
			}
		}
	}

	return parsed.text.slice(type.getStart(), type.end)
}

/** Whether a parameter is an object pattern that binds `ref`, under its own name or an alias. */
function destructuresRef(parameter: ParameterDeclaration | undefined): boolean {
	return (
		parameter !== undefined && isObjectBindingPattern(parameter.name) && bindsRef(parameter.name)
	)
}

/** Whether an object pattern binds `ref`, under its own name or an alias. */
function bindsRef(pattern: ObjectBindingPattern): boolean {
	return pattern.elements.some((element) => {
		const key = element.propertyName ?? element.name

		return key !== undefined && isIdentifier(key) && key.text === 'ref'
	})
}

/**
 * One walk: the pre-spread sites to judge, and the anchors the library reads.
 * The server parses the files of the sites in one project.
 */
function scan(server: TypeScriptServer): { sites: Site[]; anchors: Set<string> } {
	const anchors = new Set<string>()

	const files: string[] = []

	walkSource(
		srcDir,
		(path, source) => {
			if (!isSourceFile(path)) return

			for (const selector of source.matchAll(/\[data-slot=["']?([a-z0-9-]+)["']?\]/g)) {
				if (selector[1]) anchors.add(selector[1])
			}

			const file = srcRelative(path)

			if (path.endsWith('.tsx') && SCAN_ROOTS.some((root) => file.startsWith(`${root}/`))) {
				files.push(path)
			}
		},
		docsSites,
	)

	const sites = [...server.parse(files)].flatMap(([path, parsed]) =>
		sitesIn(srcRelative(path), parsed),
	)

	return { sites, anchors }
}

/** Every complaint `flag` makes, waived or not. Each test filters its own. */
function collect(
	sites: Site[],
	rule: (typeof RULES)[number],
	flag: (site: Site, attribute: Attribute) => string | undefined,
): Violation[] {
	const found: Violation[] = []

	for (const site of sites) {
		for (const attribute of site.before) {
			const detail = flag(site, attribute)

			if (detail) found.push({ file: site.file, rule, text: `${site.file}:${site.line} ${detail}` })
		}
	}

	return found
}

const waived = (violation: Violation) => Boolean(WAIVERS.get(violation.file)?.[violation.rule])

const lines = (violations: Violation[]) =>
	violations.map((violation) => violation.text).join('\n  ')

describe('spread order boundary', () => {
	// The TypeScript server parses each source that this file reads, and stops
	// after the last case.
	const server = startTypeScript()

	afterAll(() => server.close())

	const { sites, anchors } = scan(server)

	/** The sites of a fixture `source` under the file name `file`. */
	const fixture = (file: string, source: string) => sitesIn(file, server.parseText(file, source))

	const ordered = collect(sites, 'order', (site, attribute) =>
		LOAD_BEARING.test(attribute.name) || (attribute.name === 'type' && BUTTON_HOST.test(site.tag))
			? `<${site.tag}> ${attribute.name}`
			: undefined,
	)

	const anchored = collect(sites, 'anchor', (site, attribute) =>
		attribute.name === 'data-slot' && attribute.value && anchors.has(attribute.value)
			? `<${site.tag}> data-slot="${attribute.value}"`
			: undefined,
	)

	// A ref on either side of a spread that still carries a consumer ref loses
	// one of the two: before the spread the consumer ref replaces it, after the
	// spread it replaces the consumer ref.
	const refs = collect(
		sites.map((site) => ({ ...site, before: [...site.before, ...site.after] })),
		'ref',
		(site, attribute) =>
			attribute.name === 'ref' && !site.refTaken ? `<${site.tag}> ref` : undefined,
	)

	it('no element outside the waivers writes a load-bearing attribute before its spread', () => {
		const violations = ordered.filter((violation) => !waived(violation))

		expect(
			violations,
			`load-bearing attributes a stray consumer prop replaces (move them below the spread, CONVENTIONS.md §3.9):\n  ${lines(violations)}`,
		).toEqual([])
	})

	it('no element outside the waivers writes a library-read data-slot before its spread', () => {
		const violations = anchored.filter((violation) => !waived(violation))

		expect(
			violations,
			`anchors the library selects on that a consumer rename takes away (move them below the spread, CONVENTIONS.md §3.9):\n  ${lines(violations)}`,
		).toEqual([])
	})

	it('no element outside the waivers writes a ref that a consumer ref replaces', () => {
		const violations = refs.filter((violation) => !waived(violation))

		expect(
			violations,
			`internal refs a consumer ref replaces (destructure \`ref\` and join it through useComposedRef, CONVENTIONS.md §3.9):\n  ${lines(violations)}`,
		).toEqual([])
	})

	it('reads a ref taken out of the props, under an alias too', () => {
		const [taken] = fixture(
			'taken.tsx',
			`function A({ ref: outer, ...props }) { return <div ref={inner} {...props} /> }`,
		)

		const [open] = fixture(
			'open.tsx',
			`function B(props) { return <div ref={inner} {...props} /> }`,
		)

		expect(taken?.refTaken).toBe(true)

		expect(open?.refTaken).toBe(false)
	})

	it('reads a consumer spread behind a cast', () => {
		const [site] = fixture('cast.tsx', `export const a = <div role="row" {...(props as object)} />`)

		expect(site?.before).toEqual([{ name: 'role', value: 'row' }])
	})

	it('reads a rest of native props under another name, and the ref after it', () => {
		const [site] = fixture(
			'rest.tsx',
			`type BoardProps = Omit<ComponentProps<'section'>, 'className'> & { size?: string }
			function Board({ size, ...labelProps }: BoardProps) { return <section {...labelProps} ref={inner} /> }`,
		)

		expect(site?.after).toEqual([{ name: 'ref', value: undefined }])

		expect(site?.refTaken).toBe(false)
	})

	it('reads no consumer spread in a rest of props with no native base', () => {
		const sites = fixture(
			'label.tsx',
			`type GaugeProps = AccessibleName & { value: number }
			function Gauge({ value, ...labelProps }: GaugeProps) { return <div role="meter" {...labelProps} /> }`,
		)

		expect(sites).toEqual([])
	})

	it('reads a ref taken out of the props in the body, or omitted from the props type', () => {
		const [body] = fixture(
			'body.tsx',
			`type AProps = ComponentProps<'div'>
			function A(props: AProps) { const { ref: outer, ...rest } = props; return <div {...rest} ref={inner} /> }`,
		)

		const [omitted] = fixture(
			'omitted.tsx',
			`type BProps = Omit<ComponentProps<'button'>, 'ref' | 'type'>
			function B({ ...props }: BProps) { return <button {...props} ref={inner} /> }`,
		)

		expect(body?.refTaken).toBe(true)

		expect(omitted?.refTaken).toBe(true)
	})

	it('pins every waiver to the violation count it still covers', () => {
		const live = new Map<string, number>()

		for (const violation of [...ordered, ...anchored, ...refs]) {
			const key = `${violation.file} ${violation.rule}`

			live.set(key, (live.get(key) ?? 0) + 1)
		}

		const drift: string[] = []

		for (const [file, waiver] of WAIVERS) {
			for (const rule of RULES) {
				const pinned = waiver[rule] ?? 0

				const found = live.get(`${file} ${rule}`) ?? 0

				if (pinned !== found) {
					drift.push(`${file} → ${rule}: waives ${pinned}, found ${found} (${waiver.note})`)
				}
			}
		}

		expect(
			drift,
			`waivers that no longer match what the rules find (a count that fell means the fix landed, so delete or lower the waiver; a count that rose means a new violation hid behind it):\n  ${drift.join('\n  ')}`,
		).toEqual([])
	})
})
