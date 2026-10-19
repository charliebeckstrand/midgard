import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
	isSourceFile,
	srcDir,
	srcRelative,
	stripSourceComments,
	walkSource,
} from '../helpers/walk-source'

// Forced-colors boundary (CONVENTIONS §5.10).
//
// Each recipe ring that shows a state behind a gate has a `forced-colors:`
// class behind the same gate in the same file. A file that spreads
// `forced.ring.inset` or `forced.ring.outset` has the fallback for the
// `focus-visible` gate.
//
// The test reads the gate of a class from its source text. A ring that a recipe
// variant turns on, such as `active: ['ring-4']`, has no gate in its class, so
// `recipes/forced-colors.test.ts` covers it.
//
// These gates are not part of the rule:
//
//   - No gate: a resting ring is an edge, not a state.
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

/**
 * The state rings that keep their state without a fallback in the same file,
 * as `file → gate → reason`.
 */
const EXEMPT: Record<string, Record<string, string>> = {
	'recipes/kata/accordion.ts': {
		'[&:has([data-slot=accordion-trigger]:focus-visible):not(:has([data-slot=accordion-panel]_[data-slot=accordion-trigger]:focus-visible))]':
			'The header keeps `focus-visible:outline-hidden`. Tailwind gives that class an outline under forced colors, and the outline marks the focus.',
	},
	'recipes/kiso/kasane/layers.ts': {
		'focus-within':
			'The control in the frame keeps `focus:outline-hidden`. Tailwind gives that class an outline under forced colors, and the outline marks the focus.',
		'data-open':
			'An open control keeps the focus on its trigger or moves it into its popup, and each of them marks the focus.',
	},
}

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

/** Each class in the string literals of a source file, parsed, and whether the file spreads `forced.ring`. */
function read(content: string): { classes: Parsed[]; ringToken: boolean } {
	const code = stripSourceComments(content)

	const names = [...code.matchAll(/(['"`])((?:(?!\1)[^\\\n]|\\.)*)\1/g)].flatMap((match) =>
		(match[2] ?? '').split(/\s+/).filter(Boolean),
	)

	return {
		classes: [...new Set(names)].map(parse),
		ringToken: /\bforced\.ring\.(?:inset|outset)\b/.test(code),
	}
}

/** The state rings of one file that have no forced-colors fallback, as `file gate (class)`. */
function offenders(file: string, content: string): string[] {
	const { classes, ringToken } = read(content)

	const fallbacks = new Set(classes.filter((c) => c.forced).map((c) => c.gate))

	if (ringToken) fallbacks.add('focus-visible')

	const exempt = EXEMPT[file] ?? {}

	return classes
		.filter(
			({ gate, ring, forced }) =>
				ring &&
				!forced &&
				gate !== '' &&
				!/hover/.test(gate) &&
				!VALIDATION.test(gate) &&
				!fallbacks.has(gate) &&
				!(gate in exempt),
		)
		.map(({ name, gate }) => `${file} ${gate} (${name})`)
}

/** Each recipe file by its path from `src`. */
const recipes = new Map<string, string>()

walkSource(join(srcDir, 'recipes'), (file, content) => {
	if (isSourceFile(file)) recipes.set(srcRelative(file), content)
})

describe('forced-colors fallbacks in ui recipes', () => {
	it('each state ring has a forced-colors fallback behind its gate', () => {
		expect([...recipes].flatMap(([file, content]) => offenders(file, content))).toEqual([])
	})

	it('each exemption names a state ring that the recipe still draws', () => {
		const stale = Object.entries(EXEMPT).flatMap(([file, gates]) => {
			const { classes } = read(recipes.get(file) ?? '')

			return Object.keys(gates).flatMap((gate) =>
				classes.some((c) => c.ring && c.gate === gate) ? [] : [`${file} ${gate}`],
			)
		})

		expect(stale).toEqual([])
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
	})

	it('passes a resting ring, a slot ring, a hover ring, and a validation ring', () => {
		expect(
			offenders(
				'x.ts',
				"'ring-1 ring-inset **:data-[slot=avatar]:ring-2 hover:ring-2 data-invalid:ring-2 has-[[data-invalid]]:ring-2'",
			),
		).toEqual([])
	})
})
