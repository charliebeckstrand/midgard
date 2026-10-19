import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { forced } from '../../recipes/kiso/sen/forced'
import { classNames } from '../helpers/class-stops'
import {
	isSourceFile,
	srcDir,
	srcRelative,
	stripSourceComments,
	walkSource,
} from '../helpers/walk-source'

// Forced-colors boundary (CONVENTIONS §5.10).
//
// A ring is a box-shadow, and forced colors remove it. Kiso owns the rings, and
// each kiso ring carries an outline that keeps it under forced colors:
//
//   - A kata, a component, or a module writes no ring width with no gate. It
//     takes the ring from `sen.ring` or `sen.focus`.
//   - A ring behind a gate has a `forced-colors:` class behind the same gate in
//     the same file. A `forced.<name>` reference in the file counts as the
//     classes of that entry.
//   - A kiso ring with no gate has a `forced-colors:` class with no gate in the
//     same file.
//
// These gates are not part of the rule:
//
//   - A hover gate: a hover ring is a preview, and the pointer shows it.
//   - A validation gate: forced colors make red, amber, and green one color, so
//     a ring cannot tell the states apart. The message of the field tells them.

/** The width utility of a box-shadow ring: `ring`, `ring-2`, `ring-4`. */
const RING = /^ring(?:-\d+)?$/

/**
 * A variant that is not part of a gate: the color scheme, a pseudo-element
 * (the fallback can go on the pseudo-element or on its host), or a selector of
 * the children that take the class.
 */
const NOT_GATE = /^(?:dark|forced-colors|before|after|\[&::[^\]]+\]|\*\*?|data-\[slot=[^\]]+\])$/

/** A gate on the validation state of a control. */
const VALIDATION = /data-(?:invalid|warning|valid)\b/

/** One class: its gate, whether it is a ring, and whether it is a forced-colors class. */
type Parsed = { name: string; gate: string; ring: boolean; forced: boolean }

/** Splits a class into its variants and its utility at each colon that is not inside brackets or parentheses. */
function split(className: string): string[] {
	const parts: string[] = []

	let depth = 0
	let part = ''

	for (const char of className) {
		if (char === '[' || char === '(') depth++
		if (char === ']' || char === ')') depth--

		if (char === ':' && depth === 0) {
			parts.push(part)
			part = ''
		} else {
			part += char
		}
	}

	parts.push(part)

	return parts
}

function parse(name: string): Parsed {
	const parts = split(name)

	const variants = parts.slice(0, -1)

	return {
		name,
		gate: variants.filter((variant) => !NOT_GATE.test(variant)).join(':'),
		ring: RING.test((parts.at(-1) ?? '').replace(/^!|!$/g, '')),
		forced: variants.includes('forced-colors'),
	}
}

/** The classes of a `forced.<name>` reference, or none when the path names no entry. */
function entry(path: string): string[] {
	return classNames([
		path
			.split('.')
			.reduce<unknown>((node, key) => (node as Record<string, unknown> | undefined)?.[key], forced),
	])
}

/** Each class in the string literals of a source file and in its `forced.<name>` references, parsed. */
function read(content: string): Parsed[] {
	const code = stripSourceComments(content)

	const literals = [...code.matchAll(/(['"`])((?:(?!\1)[^\\\n]|\\.)*)\1/g)].map((m) => m[2] ?? '')

	const references = [...code.matchAll(/\bforced\.([\w.]+)/g)].flatMap((m) => entry(m[1] ?? ''))

	const names = [...literals, ...references].flatMap((s) => s.split(/\s+/).filter(Boolean))

	return [...new Set(names)].map(parse)
}

/** The rings of one file that break the rule, as `file gate (class)`. */
function offenders(file: string, content: string): string[] {
	const classes = read(content)

	const fallbacks = new Set(classes.filter((c) => c.forced).map((c) => c.gate))

	const kiso = file.startsWith('recipes/kiso/')

	return classes
		.filter(({ gate, ring, forced: isForced }) => {
			if (!ring || isForced || /hover/.test(gate) || VALIDATION.test(gate)) return false

			if (gate === '' && !kiso) return true

			return !fallbacks.has(gate)
		})
		.map(({ name, gate }) => `${file} ${gate || '(no gate)'} (${name})`)
}

/** The rings that break the rule in the recipes, the components, and the modules. */
const found: string[] = []

for (const dir of ['recipes', 'components', 'modules']) {
	walkSource(join(srcDir, dir), (file, content) => {
		if (isSourceFile(file)) found.push(...offenders(srcRelative(file), content))
	})
}

describe('forced-colors fallbacks in ui', () => {
	it('each ring comes from kiso or has a forced-colors fallback behind its gate', () => {
		expect(found).toEqual([])
	})

	it('finds a ring width in a kata', () => {
		expect(offenders('recipes/kata/x.ts', "'ring-1 ring-inset ring-zinc-950/10'")).toEqual([
			'recipes/kata/x.ts (no gate) (ring-1)',
		])

		expect(offenders('components/x.tsx', "'**:data-[slot=avatar]:ring-2'")).toHaveLength(1)
	})

	it('finds a kiso ring with no fallback', () => {
		expect(offenders('recipes/kiso/x.ts', "'ring-1'")).toEqual([
			'recipes/kiso/x.ts (no gate) (ring-1)',
		])

		expect(offenders('recipes/kiso/x.ts', "'ring-1', forced.outline")).toEqual([])
	})

	it('finds a state ring with no fallback', () => {
		expect(offenders('x.ts', "'data-active:ring-2'")).toEqual([
			'x.ts data-active (data-active:ring-2)',
		])

		expect(offenders('x.ts', "'group-focus-visible/thumb:after:ring-4'")).toEqual([
			'x.ts group-focus-visible/thumb (group-focus-visible/thumb:after:ring-4)',
		])
	})

	it('passes a ring with a fallback behind the same gate', () => {
		expect(
			offenders(
				'x.ts',
				"'data-active:ring-2 dark:data-active:ring-blue-500 forced-colors:data-active:outline-2'",
			),
		).toEqual([])

		expect(
			offenders(
				'x.ts',
				"'group-focus-visible/thumb:after:ring-4 forced-colors:group-focus-visible/thumb:after:outline-2'",
			),
		).toEqual([])

		expect(
			offenders('x.ts', "'focus-visible:[&::-moz-range-thumb]:ring-4', ...forced.ring.outset"),
		).toEqual([])
	})

	it('fails a fallback behind another gate', () => {
		expect(
			offenders('x.ts', "'data-active:ring-2 forced-colors:focus-visible:outline-2'"),
		).toHaveLength(1)

		expect(offenders('x.ts', "'data-active:ring-2', ...forced.ring.inset")).toHaveLength(1)
	})

	it('passes a hover ring and a validation ring', () => {
		expect(
			offenders(
				'recipes/kata/x.ts',
				"'hover:ring-2 data-invalid:ring-2 has-[[data-invalid]]:ring-2'",
			),
		).toEqual([])
	})
})
