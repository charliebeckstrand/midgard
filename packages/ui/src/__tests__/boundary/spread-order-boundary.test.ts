import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { srcDir, walkSource } from '../helpers/walk-source'

// Spread-order boundary.
//
// CONVENTIONS.md §3.9 decides what a consumer may override by where an
// attribute sits relative to `{...props}`. Two rules, both mechanical:
//
//   1. A load-bearing structural attribute — `type` on an element that renders
//      a button, plus `role`, `tabIndex` and the widget ARIA state — is written
//      AFTER the consumer spread, so a stray prop cannot turn a button into a
//      form submit or drop a row out of roving.
//
//   2. A `data-slot` anchor binds by who reads it. An anchor the library itself
//      selects on — a roving `itemSelector`, or a kata `has-[]` rule — is
//      written AFTER the spread and locked; every other anchor is written
//      BEFORE it, so a wrapper can re-anchor the leaf it renders.
//
// Rule 2's read set is computed, not listed: every `[data-slot=…]` selector in
// the shipped tree. `docs` is excluded from that scan because the demo tree is
// a consumer root, not library infrastructure — a demo that queries an anchor
// does not make it load-bearing.
//
// NOT covered, deliberately: `type` on the input family. §3.9 names `type`
// for the form-submit hazard, which is a button concern; a consumer setting
// `type="password"` on a CVV field or `type="search"` on a text input is
// legitimate, so those writes are not violations to gate.
//
// Both rules carry an ALLOWLIST. Unlike the spacing boundary's, most entries
// are not sanctioned exceptions but the known backlog the 2026-09-13 bug audit
// records; each is tagged with its row or lead. The gate's job today is to stop
// instance N+1. A step that fixes a row deletes its entry here in the same
// change.

const SCAN_ROOTS = [join(srcDir, 'components'), join(srcDir, 'primitives'), join(srcDir, 'layouts')]

// The spread a consumer's props arrive through. An internal bag spread under
// another name (`{...triggerProps}`) is resolved wiring, not consumer input.
const CONSUMER_SPREAD = /^(?:props|rest)$/

const WIDGET_ARIA =
	/^aria-(?:checked|selected|expanded|pressed|current|orientation|disabled|invalid|required|multiselectable|activedescendant)$/

// Elements that render a real `<button>`, where a stray `type` submits a form.
const BUTTON_ELEMENT = /^(?:button|Button|ToggleIconButton|Element|Polymorphic\w*)$/

/** Rows the 2026-09-13 bug audit already tracks, plus deliberate exceptions. */
const LOAD_BEARING_ALLOWLIST = new Set([
	// Audit rows, closed by their own step.
	'components/checkbox/checkbox-group.tsx', // B03-C14 · S2
	'components/radio/radio-group.tsx', // B03-C13 · S2
	'components/tabs/tab-list.tsx', // B04-C04 · S5
	'components/nav/nav-item.tsx', // B04-C07 · S5
	'components/sidebar/sidebar-item.tsx', // B04-C08 · S5
	'components/hold-button/hold-button.tsx', // B05-C03 · S6
	// Audit leads, no row yet.
	'components/pagination/pagination-utilities.tsx',
	'primitives/polymorphic/fallback.tsx',
	'components/menu/menu-item.tsx',
	'primitives/option/option.tsx',
	'components/breadcrumb/breadcrumb-link.tsx',
	'components/breadcrumb/breadcrumb-separator.tsx',
	'components/command-palette/slots.tsx',
	'components/fieldset/message.tsx',
	'components/odometer/odometer.tsx',
	'components/pagination/pagination-page.tsx',
	'components/stepper/stepper-separator.tsx',
	'components/tabs/tab-panel.tsx',
	'primitives/toggle/toggle.tsx',
	// Deliberate: the viewport documents the override at scroll-area.tsx:64-66 —
	// a consumer supplies `tabIndex={-1}` with its own `role`/`aria-label`.
	'components/scroll-area/scroll-area.tsx',
])

/** Anchors the library reads that still sit before the spread. Audit lead `S1`. */
const ANCHOR_ALLOWLIST = new Set([
	// Audit rows, closed by their own step.
	'components/nav/nav-item.tsx', // B04-C07 · S5
	'components/sidebar/sidebar-item.tsx', // B04-C08 · S5
	// Audit lead `S1`, no row yet.
	'components/badge/badge.tsx',
	'components/fieldset/description.tsx',
	'components/fieldset/field.tsx',
	'components/fieldset/label.tsx',
	'components/fieldset/message.tsx',
	'components/list/list-item.tsx',
	'components/switch/switch-field.tsx',
	'primitives/control/control.tsx',
	'primitives/toggle/toggle.tsx',
])

type Token = { kind: 'spread' | 'attr'; name: string }

/**
 * Walk from just past an open tag's name to the `>` that ends it, at bracket
 * depth zero. Strings, template literals and comments are skipped whole, so a
 * `>` inside `className="a>b"` or inside a nested element in an attribute value
 * cannot end the tag early. Returns -1 when the tag never closes.
 */
function openTagEnd(source: string, index: number): number {
	let depth = 0

	let i = index

	while (i < source.length) {
		const c = source[i]

		if (c === '"' || c === "'" || c === '`') {
			const quote = c

			i++

			while (i < source.length && source[i] !== quote) i += source[i] === '\\' ? 2 : 1

			i++

			continue
		}

		if (c === '/' && source[i + 1] === '/') {
			while (i < source.length && source[i] !== '\n') i++

			continue
		}

		if (c === '/' && source[i + 1] === '*') {
			i = source.indexOf('*/', i) + 2

			continue
		}

		if (c === '{' || c === '(' || c === '[') depth++
		else if (c === '}' || c === ')' || c === ']') depth--
		else if (c === '>' && depth === 0) return i

		i++
	}

	return -1
}

/** Skip one attribute value — a `{...}` expression or a quoted literal. */
function valueEnd(tag: string, index: number): number {
	let i = index

	while (i < tag.length && /\s/.test(tag[i] ?? '')) i++

	if (tag[i] === '{') {
		let depth = 0

		for (; i < tag.length; i++) {
			if (tag[i] === '{') depth++
			else if (tag[i] === '}' && --depth === 0) break
		}

		return i + 1
	}

	if (tag[i] === '"' || tag[i] === "'") {
		const quote = tag[i]

		i++

		while (i < tag.length && tag[i] !== quote) i++

		return i + 1
	}

	return i
}

/** The ordered spread and attribute tokens of one open tag. */
function tokenize(tag: string): Token[] {
	const tokens: Token[] = []

	let i = 0

	while (i < tag.length) {
		if (tag[i] === '/' && tag[i + 1] === '/') {
			while (i < tag.length && tag[i] !== '\n') i++

			continue
		}

		if (tag[i] === '/' && tag[i + 1] === '*') {
			i = tag.indexOf('*/', i) + 2

			continue
		}

		if (tag[i] === '{') {
			const end = valueEnd(tag, i)

			const spread = /^\{\s*\.\.\.\s*([A-Za-z_$][\w$]*)/.exec(tag.slice(i, end))

			if (spread?.[1]) tokens.push({ kind: 'spread', name: spread[1] })

			i = end

			continue
		}

		const attr = /^([A-Za-z_][\w:-]*)\s*(=)?/.exec(tag.slice(i))

		if (attr?.[1]) {
			tokens.push({ kind: 'attr', name: attr[1] })

			i = attr[2] ? valueEnd(tag, i + attr[0].length) : i + attr[0].length

			continue
		}

		i++
	}

	return tokens
}

type Element = {
	file: string
	line: number
	tag: string
	tokens: Token[]
	spreadAt: number
	text: string
}

/** Every JSX element under the scan roots that takes a consumer spread. */
function elements(): Element[] {
	const found: Element[] = []

	for (const root of SCAN_ROOTS) {
		walkSource(root, (path, source) => {
			if (!path.endsWith('.tsx')) return

			const file = relative(srcDir, path).split(sep).join('/')

			for (const open of source.matchAll(/<([A-Za-z][\w.]*)/g)) {
				const from = open.index + open[0].length

				const end = openTagEnd(source, from)

				if (end < 0) continue

				const text = source.slice(from, end)

				const tokens = tokenize(text)

				const spreadAt = tokens.findIndex(
					(t) => t.kind === 'spread' && CONSUMER_SPREAD.test(t.name),
				)

				if (spreadAt < 0) continue

				found.push({
					file,
					line: source.slice(0, open.index).split('\n').length,
					tag: open[1] ?? '',
					tokens,
					spreadAt,
					text,
				})
			}
		})
	}

	return found
}

/** Anchors the library selects on, from every `[data-slot=…]` in the shipped tree. */
function readAnchors(): Set<string> {
	const anchors = new Set<string>()

	walkSource(
		srcDir,
		(path, source) => {
			if (!/\.tsx?$/.test(path)) return

			for (const m of source.matchAll(/\[data-slot=["']?([a-z0-9-]+)["']?\]/g)) {
				if (m[1]) anchors.add(m[1])
			}
		},
		new Set(['docs']),
	)

	return anchors
}

describe('spread order boundary', () => {
	const all = elements()

	it('writes load-bearing structural attributes after the consumer spread', () => {
		const violations: string[] = []

		for (const el of all) {
			if (LOAD_BEARING_ALLOWLIST.has(el.file)) continue

			el.tokens.slice(0, el.spreadAt).forEach((t) => {
				if (t.kind !== 'attr') return

				const loadBearing =
					t.name === 'role' ||
					t.name === 'tabIndex' ||
					WIDGET_ARIA.test(t.name) ||
					(t.name === 'type' && BUTTON_ELEMENT.test(el.tag))

				if (loadBearing) violations.push(`${el.file}:${el.line} <${el.tag}> ${t.name}`)
			})
		}

		expect(
			violations,
			`CONVENTIONS.md §3.9: these sit before \`{...props}\`, so a stray consumer prop replaces them. Move them below the spread:\n${violations
				.map((v) => `  ${v}`)
				.join('\n')}`,
		).toEqual([])
	})

	it('locks a data-slot anchor the library reads, and leaves every other one renameable', () => {
		const anchors = readAnchors()

		const violations: string[] = []

		for (const el of all) {
			if (ANCHOR_ALLOWLIST.has(el.file)) continue

			const slot = /data-slot="([a-z0-9-]+)"/.exec(el.text)?.[1]

			if (!slot || !anchors.has(slot)) continue

			const at = el.tokens.findIndex((t) => t.kind === 'attr' && t.name === 'data-slot')

			if (at >= 0 && at < el.spreadAt) {
				violations.push(`${el.file}:${el.line} <${el.tag}> data-slot="${slot}"`)
			}
		}

		expect(
			violations,
			`CONVENTIONS.md §3.9: the library selects on these anchors, so a consumer rename takes them away. Move them below the spread:\n${violations
				.map((v) => `  ${v}`)
				.join('\n')}`,
		).toEqual([])
	})
})
