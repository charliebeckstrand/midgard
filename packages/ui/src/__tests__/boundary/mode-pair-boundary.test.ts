import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { srcDir, srcRelative, stripSourceComments, walkSource } from '../helpers/walk-source'

// Mode-pair boundary.
//
// The kiso README (§6) says that a light class and its `dark:` pair go
// through `mode(light, dark)`. A string literal that holds a `dark:` class and
// a class with no `dark` variant is an open pair, so kiso and kumi write no such
// literal. The `dark` variant can come after other variants, as in
// `not-has-[…]:dark:hover:`.
//
// `iro/palette.ts` is the one exception. Each entry of the palette is the whole
// class string of one variant in one color, light and dark together, because
// a kata reads the entry as one value (kiso README §5).

const SCAN_ROOTS = [join(srcDir, 'recipes', 'kiso'), join(srcDir, 'recipes', 'kumi')]

/** The palette: one literal string for each variant in each color. */
const PALETTE = 'recipes/kiso/iro/palette.ts'

const LITERAL = /'([^'\n]*)'/g

/** A class with the `dark` variant in any position, such as `not-has-[…]:dark:hover:`. */
const DARK = /(?:^|:)dark:/

describe('mode-pair boundary', () => {
	it('writes each light and dark pair in kiso and kumi through mode()', () => {
		const violations: string[] = []

		for (const root of SCAN_ROOTS) {
			walkSource(root, (path, source) => {
				if (!/\.ts$/.test(path)) return

				const rel = srcRelative(path)

				if (rel === PALETTE) return

				for (const [, literal = ''] of stripSourceComments(source).matchAll(LITERAL)) {
					const classes = literal.split(/\s+/).filter(Boolean)

					const dark = classes.some((name) => DARK.test(name))
					const light = classes.some((name) => !DARK.test(name))

					if (dark && light) violations.push(`${rel}: '${literal}'`)
				}
			})
		}

		expect(
			violations,
			`open light and dark pairs (write \`...mode(light, dark)\` instead):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})
})
