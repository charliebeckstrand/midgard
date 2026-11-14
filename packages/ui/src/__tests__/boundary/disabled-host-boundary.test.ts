import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { srcDir, srcRelative, stripSourceComments, walkSource } from '../helpers/walk-source'

// Disabled-host boundary.
//
// A box that dims through the native control inside it, such as the box of a
// checkbox or the track of a switch, takes `hannou.disabled.host`. The form was
// spelled three ways (`has-disabled`, `has-[:disabled]`, with and without the
// cursor), so no file but `recipes/kiso/hannou/disabled.ts` dims a box on a
// disabled descendant. A frame that reads only its direct child
// (`has-[>:disabled]`, `kasane.layers`) is a different rule: its affixes can be
// disabled apart from its control.

const HOME = 'recipes/kiso/hannou/disabled.ts'

/** A dim on a disabled descendant, in each spelling. */
const HOST_DIM = /\bhas-(?:disabled|\[:disabled\]):opacity-/

describe('disabled-host boundary', () => {
	it('dims a box on a disabled descendant only in hannou', () => {
		const violations: string[] = []

		walkSource(join(srcDir, 'recipes'), (path, source) => {
			if (!/\.ts$/.test(path)) return

			const rel = srcRelative(path)

			if (rel === HOME) return

			if (HOST_DIM.test(stripSourceComments(source))) violations.push(rel)
		})

		expect(
			violations,
			`files that dim a box on a disabled descendant (spread \`hannou.disabled.host\` instead):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})
})
