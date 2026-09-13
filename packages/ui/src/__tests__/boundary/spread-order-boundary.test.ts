import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { srcDir, srcRelative, walkSource } from '../helpers/walk-source'

// Spread-order boundary. CONVENTIONS.md §3.9 decides what a consumer may
// override by where an attribute sits relative to `{...props}`. The rule has
// two halves — the load-bearing attributes, and the `data-slot` anchor — and
// §3.9 states both. This suite holds them; it does not restate them.
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

const LOAD_BEARING =
	/^(?:role|tabIndex|aria-(?:checked|selected|expanded|pressed|current|orientation|disabled|invalid|required|multiselectable|activedescendant))$/

// Hosts that put a real `<button>` in the DOM, where a stray `type` submits
// the enclosing form.
const BUTTON_HOST = /^(?:button|Button|ToggleIconButton|Element|Polymorphic\w*)$/

/**
 * Files a rule does not hold yet, by the rule each one waives.
 *
 * @remarks
 * Almost every entry is backlog, not exemption: `note` names the audit row or
 * lead that owns it, and the step that closes the row deletes the entry. Only
 * a `keep` entry is a decision. The third test fails when an entry stops
 * matching a violation, so a fixed or renamed file leaves no dead waiver.
 */
const WAIVERS = new Map([
	['components/checkbox/checkbox-group.tsx', { rules: ['order'], note: 'B03-C14 · S2' }],
	['components/radio/radio-group.tsx', { rules: ['order'], note: 'B03-C13 · S2' }],
	['components/tabs/tab-list.tsx', { rules: ['order'], note: 'B04-C04 · S5' }],
	['components/nav/nav-item.tsx', { rules: ['order', 'anchor'], note: 'B04-C07 · S5' }],
	['components/sidebar/sidebar-item.tsx', { rules: ['order', 'anchor'], note: 'B04-C08 · S5' }],
	['components/hold-button/hold-button.tsx', { rules: ['order'], note: 'B05-C03 · S6' }],
	['components/breadcrumb/breadcrumb-link.tsx', { rules: ['order'], note: 'lead' }],
	['components/breadcrumb/breadcrumb-separator.tsx', { rules: ['order'], note: 'lead' }],
	['components/command-palette/slots.tsx', { rules: ['order'], note: 'lead' }],
	['components/menu/menu-item.tsx', { rules: ['order'], note: 'lead' }],
	['components/odometer/odometer.tsx', { rules: ['order'], note: 'lead' }],
	['components/pagination/pagination-page.tsx', { rules: ['order'], note: 'lead' }],
	['components/pagination/pagination-utilities.tsx', { rules: ['order'], note: 'lead' }],
	['components/stepper/stepper-separator.tsx', { rules: ['order'], note: 'lead' }],
	['components/tabs/tab-panel.tsx', { rules: ['order'], note: 'lead' }],
	['primitives/option/option.tsx', { rules: ['order'], note: 'lead' }],
	['primitives/polymorphic/fallback.tsx', { rules: ['order'], note: 'lead' }],
	['components/badge/badge.tsx', { rules: ['anchor'], note: 'lead S1' }],
	['components/fieldset/description.tsx', { rules: ['anchor'], note: 'lead S1' }],
	['components/fieldset/field.tsx', { rules: ['anchor'], note: 'lead S1' }],
	['components/fieldset/label.tsx', { rules: ['anchor'], note: 'lead S1' }],
	['components/fieldset/message.tsx', { rules: ['order', 'anchor'], note: 'lead · lead S1' }],
	['components/list/list-item.tsx', { rules: ['anchor'], note: 'lead S1' }],
	['components/switch/switch-field.tsx', { rules: ['anchor'], note: 'lead S1' }],
	['primitives/control/control.tsx', { rules: ['anchor'], note: 'lead S1' }],
	['primitives/toggle/toggle.tsx', { rules: ['order', 'anchor'], note: 'lead · lead S1' }],
	[
		'components/scroll-area/scroll-area.tsx',
		{
			rules: ['order'],
			keep: true,
			note: 'the viewport documents the override: a consumer supplies tabIndex with its own role and label',
		},
	],
])

/** One JSX attribute written before the consumer spread. */
type Attribute = { name: string; value?: string }

/** One JSX element that takes a consumer spread, and the attributes above it. */
type Site = { file: string; line: number; tag: string; before: Attribute[] }

/** One rule's complaint about one attribute. */
type Violation = { file: string; rule: string; text: string }

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

	const visit = (node: ts.Node): void => {
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
				if (CONSUMER_SPREAD.test(text(property.expression))) {
					sites.push({
						file,
						line: parsed.getLineAndCharacterOfPosition(node.tagName.getStart(parsed)).line + 1,
						tag: text(node.tagName),
						before,
					})

					break
				}
			}
		}

		ts.forEachChild(node, visit)
	}

	visit(parsed)

	return sites
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
	rule: string,
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

const waived = (violation: Violation) =>
	WAIVERS.get(violation.file)?.rules.includes(violation.rule) === true

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

	it('waives no file that has stopped violating its rule', () => {
		const live = new Set([...ordered, ...anchored].map((v) => `${v.file} ${v.rule}`))

		const dead: string[] = []

		for (const [file, waiver] of WAIVERS) {
			for (const rule of waiver.rules) {
				if (!live.has(`${file} ${rule}`)) dead.push(`${file} → ${rule} (${waiver.note})`)
			}
		}

		expect(
			dead,
			`waivers that match no violation (delete them, they only widen the gate):\n  ${dead.join('\n  ')}`,
		).toEqual([])
	})
})
