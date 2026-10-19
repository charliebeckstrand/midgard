import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { srcDir, srcRelative, stripSourceComments, walkSource } from '../helpers/walk-source'

// Forced-colors boundary.
//
// A ring is a box-shadow, and forced colors remove a box-shadow. When a recipe
// draws a state with a ring behind a variant, such as a focus ring or the mark
// of an active cell, the state disappears under forced colors. Thus each state
// ring has a `forced-colors:` class behind the same gate in the same file,
// usually a `Highlight` outline. A file can also spread `sen.forced.ring`,
// which holds that outline for the `focus-visible` gate (CONVENTIONS §5).
//
// The test reads the gate of a class from its source text. A ring that a recipe
// variant turns on, such as `active: ['ring-4']`, has no gate in its class, so
// the recipe test `recipes/forced-colors.test.ts` covers it.
//
// These gates are not part of the rule:
//
//   - No gate: a resting ring is an edge, not a state. The recipe test covers
//     the edges that are the only paint of a part.
//   - A hover gate: a hover ring is a preview, and the pointer shows it.
//   - A validation gate: forced colors make red, amber, and green one color, so
//     a ring cannot tell the states apart. The message of the field tells them.

/** The width utility of a box-shadow ring: `ring`, `ring-2`, `ring-4`. */
const RING = /^ring(?:-\d+)?$/

/** A variant that names a pseudo-element. The fallback can go on the pseudo-element or on its host. */
const PSEUDO_ELEMENT = /^(?:before|after|\[&::[^\]]+\])$/

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
	'recipes/kata/avatar.ts': {
		'**:data-[slot=avatar]': 'The ring is the gap between two stacked avatars. It is not a state.',
	},
	'recipes/kiso/kasane/layers.ts': {
		'focus-within':
			'The control in the frame keeps `focus:outline-hidden`. Tailwind gives that class an outline under forced colors, and the outline marks the focus.',
		'data-open':
			'An open control keeps the focus on its trigger or moves it into its popup, and each of them marks the focus.',
	},
}

/**
 * Splits a class into its variants and its utility at each colon that is not
 * inside brackets or parentheses.
 */
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

/** The gate of a class: its variants without `dark`, `forced-colors`, and the pseudo-element variants. */
function gateOf(variants: readonly string[]): string {
	return variants
		.filter(
			(variant) =>
				variant !== 'dark' && variant !== 'forced-colors' && !PSEUDO_ELEMENT.test(variant),
		)
		.join(':')
}

/** Each class name in the string literals of `code`. */
function classNamesIn(code: string): string[] {
	return [...code.matchAll(/(['"`])((?:(?!\1)[^\\\n]|\\.)*)\1/g)].flatMap((match) =>
		(match[2] ?? '').split(/\s+/).filter(Boolean),
	)
}

/** The state rings of one recipe file that have no forced-colors fallback, as `file gate (class)`. */
function offenders(file: string, content: string): string[] {
	const code = stripSourceComments(content)

	const classes = classNamesIn(code)

	const fallbacks = new Set(
		classes.flatMap((className) => {
			const parts = split(className)

			return parts.includes('forced-colors') ? [gateOf(parts.slice(0, -1))] : []
		}),
	)

	// `sen.forced.ring` holds the fallback for the `focus-visible` gate.
	if (/\bforced\.ring\.(?:inset|outset)\b/.test(code)) fallbacks.add('focus-visible')

	const exempt = EXEMPT[file] ?? {}

	const found = new Set<string>()

	for (const className of classes) {
		const parts = split(className)

		const utility = (parts.at(-1) ?? '').replace(/^!|!$/g, '')

		if (!RING.test(utility) || parts.includes('forced-colors')) continue

		const gate = gateOf(parts.slice(0, -1))

		if (gate === '' || /hover/.test(gate) || VALIDATION.test(gate)) continue

		if (fallbacks.has(gate) || gate in exempt) continue

		found.add(`${file} ${gate} (${className})`)
	}

	return [...found]
}

/** Each recipe file with its path from `src`. */
function recipeFiles(): [string, string][] {
	const files: [string, string][] = []

	walkSource(join(srcDir, 'recipes'), (file, content) => {
		if (/\.ts$/.test(file)) files.push([srcRelative(file), content])
	})

	return files
}

describe('forced-colors fallbacks in ui recipes', () => {
	it('each state ring has a forced-colors fallback behind its gate', () => {
		expect(recipeFiles().flatMap(([file, content]) => offenders(file, content))).toEqual([])
	})

	it('each exemption names a state ring that the recipe still draws', () => {
		const files = new Map(recipeFiles())

		const stale = Object.entries(EXEMPT).flatMap(([file, gates]) => {
			const classes = classNamesIn(stripSourceComments(files.get(file) ?? ''))

			return Object.keys(gates).flatMap((gate) => {
				const used = classes.some((className) => {
					const parts = split(className)

					return RING.test(parts.at(-1) ?? '') && gateOf(parts.slice(0, -1)) === gate
				})

				return used ? [] : [`${file} ${gate}`]
			})
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

	it('passes a resting ring, a hover ring, and a validation ring', () => {
		expect(
			offenders(
				'x.ts',
				"'ring-1 ring-inset hover:ring-2 data-invalid:ring-2 has-[[data-invalid]]:ring-2'",
			),
		).toEqual([])
	})
})
