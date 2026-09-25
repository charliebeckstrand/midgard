import ts from '@typescript/typescript6'
import { describe, expect, it } from 'vitest'
import { srcDir, srcRelative, walkSource } from '../helpers/walk-source'

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

const SCAN_ROOTS = ['components', 'primitives', 'layouts']

// The spread a consumer's props arrive through. An internal bag under another
// name (`{...triggerProps}`) is resolved wiring, not consumer input.
const CONSUMER_SPREAD = /^(?:props|rest)$/

/**
 * The expression under its parentheses and casts. A cast changes the type of a
 * spread, not the keys it carries, so `{...(props as T)}` is a consumer spread.
 */
function uncast(node: ts.Expression): ts.Expression {
	return ts.isParenthesizedExpression(node) ||
		ts.isAsExpression(node) ||
		ts.isSatisfiesExpression(node) ||
		ts.isNonNullExpression(node)
		? uncast(node.expression)
		: node
}

const LOAD_BEARING =
	/^(?:role|tabIndex|aria-(?:checked|selected|expanded|pressed|current|orientation|disabled|invalid|required|multiselectable|activedescendant))$/

// Hosts that put a real `<button>` in the DOM, where a stray `type` submits
// the enclosing form.
const BUTTON_HOST = /^(?:button|Button|ToggleIconButton|Element|Polymorphic\w*)$/

/** A rule this file does not hold yet, and how many violations it still has. */
type Waiver = { order?: number; anchor?: number; ref?: number; keep?: true; note: string }

/**
 * Files a rule does not hold yet, pinned to the violation count each one
 * covers.
 *
 * @remarks
 * Almost every entry is backlog, not exemption: `note` names the audit row or
 * lead that owns it, and the step that closes the row deletes the entry. Only
 * a `keep` entry is a decision. The count is what makes the waiver narrow — a
 * file-wide waiver would absorb a new violation in an already-waived file, and
 * the third test fails the moment a count moves in either direction.
 */
const WAIVERS = new Map<string, Waiver>([
	['components/breadcrumb/breadcrumb-link.tsx', { order: 1, note: 'lead' }],
	['components/breadcrumb/breadcrumb-separator.tsx', { order: 1, note: 'lead' }],
	['components/command-palette/slots.tsx', { order: 1, note: 'lead' }],
	['components/menu/menu-item.tsx', { order: 1, note: 'lead' }],
	['components/odometer/odometer.tsx', { order: 1, note: 'lead' }],
	['components/pagination/pagination-page.tsx', { order: 1, note: 'lead' }],
	['components/pagination/pagination-utilities.tsx', { order: 1, note: 'lead' }],
	['components/stepper/stepper-separator.tsx', { order: 1, note: 'lead' }],
	['primitives/option/option.tsx', { order: 4, note: 'lead' }],
	['primitives/polymorphic/fallback.tsx', { order: 1, note: 'lead' }],
	['components/badge/badge.tsx', { anchor: 1, note: 'lead S1' }],
	['components/fieldset/description.tsx', { anchor: 1, note: 'lead S1' }],
	['components/fieldset/field.tsx', { anchor: 1, note: 'lead S1' }],
	['components/fieldset/label.tsx', { anchor: 1, note: 'lead S1' }],
	['components/fieldset/message.tsx', { anchor: 2, note: 'lead S1' }],
	['components/list/list-item.tsx', { anchor: 1, note: 'lead S1' }],
	['components/switch/switch-field.tsx', { anchor: 1, note: 'lead S1' }],
	['primitives/control/control.tsx', { anchor: 1, note: 'lead S1' }],
	['primitives/toggle/toggle.tsx', { order: 1, anchor: 2, note: 'lead · lead S1' }],
	[
		'components/scroll-area/scroll-area.tsx',
		{
			order: 1,
			keep: true,
			note: 'the viewport documents the override: a consumer supplies tabIndex with its own role and label',
		},
	],
])

/** One JSX attribute written before the consumer spread. */
type Attribute = { name: string; value?: string }

/**
 * One JSX element that takes a consumer spread, and the attributes above it.
 * `refTaken` is true when an enclosing function destructures `ref` from its
 * props, so the spread cannot carry one.
 */
type Site = { file: string; line: number; tag: string; before: Attribute[]; refTaken: boolean }

/** The rules this suite holds, and the keys a waiver pins a count against. */
const RULES = ['order', 'anchor', 'ref'] as const

/** One rule's complaint about one attribute. */
type Violation = { file: string; rule: (typeof RULES)[number]; text: string }

/**
 * The attributes written before the consumer spread, for every JSX element in
 * one file that takes one. An element with no consumer spread is skipped,
 * because §3.9 speaks only about the two sides of that spread.
 */
function sitesIn(file: string, source: string): Site[] {
	const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, false, ts.ScriptKind.TSX)

	const sites: Site[] = []

	// A JSX name can be an identifier or a namespaced name, so read it from the
	// source. `getStart` skips the leading trivia that `pos` includes: without
	// it, an attribute below a comment reads as the comment plus its own name.
	const text = (node: ts.Node) => source.slice(node.getStart(parsed), node.end)

	// How many enclosing functions destructure `ref` from their first parameter.
	let refTakers = 0

	const visit = (node: ts.Node): void => {
		const takesRef = ts.isFunctionLike(node) && destructuresRef(node.parameters[0])

		if (takesRef) refTakers += 1

		if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
			const before: Attribute[] = []

			for (const property of node.attributes.properties) {
				if (!ts.isJsxSpreadAttribute(property)) {
					before.push({
						name: text(property.name),
						value:
							property.initializer && ts.isStringLiteral(property.initializer)
								? property.initializer.text
								: undefined,
					})

					continue
				}

				// The consumer spread closes the run; a later internal bag does not.
				if (CONSUMER_SPREAD.test(text(uncast(property.expression)))) {
					sites.push({
						file,
						line: parsed.getLineAndCharacterOfPosition(node.tagName.getStart(parsed)).line + 1,
						tag: text(node.tagName),
						before,
						refTaken: refTakers > 0,
					})

					break
				}
			}
		}

		ts.forEachChild(node, visit)

		if (takesRef) refTakers -= 1
	}

	visit(parsed)

	return sites
}

/** Whether a parameter is an object pattern that binds `ref`, under its own name or an alias. */
function destructuresRef(parameter: ts.ParameterDeclaration | undefined): boolean {
	if (!parameter || !ts.isObjectBindingPattern(parameter.name)) return false

	return parameter.name.elements.some((element) => {
		const key = element.propertyName ?? element.name

		return ts.isIdentifier(key) && key.text === 'ref'
	})
}

/** One walk: the pre-spread sites to judge, and the anchors the library reads. */
function scan(): { sites: Site[]; anchors: Set<string> } {
	const sites: Site[] = []

	const anchors = new Set<string>()

	walkSource(
		srcDir,
		(path, source) => {
			if (!/\.tsx?$/.test(path)) return

			for (const selector of source.matchAll(/\[data-slot=["']?([a-z0-9-]+)["']?\]/g)) {
				if (selector[1]) anchors.add(selector[1])
			}

			const file = srcRelative(path)

			if (path.endsWith('.tsx') && SCAN_ROOTS.some((root) => file.startsWith(`${root}/`))) {
				sites.push(...sitesIn(file, source))
			}
		},
		new Set(['docs']),
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

const lines = (violations: Violation[]) => violations.map((v) => v.text).join('\n  ')

describe('spread order boundary', () => {
	const { sites, anchors } = scan()

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

	const refs = collect(sites, 'ref', (site, attribute) =>
		attribute.name === 'ref' && !site.refTaken ? `<${site.tag}> ref` : undefined,
	)

	it('no element outside the waivers writes a load-bearing attribute before its spread', () => {
		const violations = ordered.filter((v) => !waived(v))

		expect(
			violations,
			`load-bearing attributes a stray consumer prop replaces (move them below the spread, CONVENTIONS.md §3.9):\n  ${lines(violations)}`,
		).toEqual([])
	})

	it('no element outside the waivers writes a library-read data-slot before its spread', () => {
		const violations = anchored.filter((v) => !waived(v))

		expect(
			violations,
			`anchors the library selects on that a consumer rename takes away (move them below the spread, CONVENTIONS.md §3.9):\n  ${lines(violations)}`,
		).toEqual([])
	})

	it('no element outside the waivers writes a ref that a consumer ref replaces', () => {
		const violations = refs.filter((v) => !waived(v))

		expect(
			violations,
			`internal refs a consumer ref replaces (destructure \`ref\` and join it through useComposedRef, CONVENTIONS.md §3.9):\n  ${lines(violations)}`,
		).toEqual([])
	})

	it('reads a ref taken out of the props, under an alias too', () => {
		const [taken] = sitesIn(
			'taken.tsx',
			`function A({ ref: outer, ...props }) { return <div ref={inner} {...props} /> }`,
		)

		const [open] = sitesIn(
			'open.tsx',
			`function B(props) { return <div ref={inner} {...props} /> }`,
		)

		expect(taken?.refTaken).toBe(true)

		expect(open?.refTaken).toBe(false)
	})

	it('reads a consumer spread behind a cast', () => {
		const [site] = sitesIn('cast.tsx', `export const a = <div role="row" {...(props as object)} />`)

		expect(site?.before).toEqual([{ name: 'role', value: 'row' }])
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
