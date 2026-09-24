import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { hannou } from '../../recipes/kiso'
import { srcDir, srcRelative, stripSourceComments, walkSource } from '../helpers/walk-source'

// Grab-cursor boundary.
//
// A surface the reader drags takes its cursors from `hannou.grab`, or from
// `hannou.grabCursor` where it must keep touch scrolling. The rules lived in
// ten places, each slightly different: some closed the hand on `:active`, some
// on `data-dragging`, and two grips never closed it or never set `touch-none`.
//
// Two rules keep the one source of truth:
//
//   1. No file but `recipes/kiso/hannou/cursor.ts` spells `cursor-grab`, which
//      also matches `cursor-grabbing`.
//
//   2. The bundle closes the hand on `data-dragging`, never on `:active`. A
//      right-click presses an element into `:active` too, and a context menu
//      that swallows the `pointerup` leaves an `:active` cursor stuck closed.

// Every layer that spells Tailwind classes.
const SCAN_ROOTS = [
	join(srcDir, 'recipes'),
	join(srcDir, 'components'),
	join(srcDir, 'modules'),
	join(srcDir, 'primitives'),
	join(srcDir, 'layouts'),
	join(srcDir, 'hooks'),
].filter((root) => existsSync(root))

/** The one file that spells the grab cursors. */
const HOME = 'recipes/kiso/hannou/cursor.ts'

const GRAB_CURSOR = /\bcursor-grab/

describe('grab-cursor boundary', () => {
	it('spells the grab cursors only in hannou', () => {
		const violations: string[] = []

		for (const root of SCAN_ROOTS) {
			walkSource(root, (path, source) => {
				if (!/\.(?:tsx?|mts|cts)$/.test(path)) return

				const rel = srcRelative(path)

				if (rel === HOME) return

				// Prose that names the class is not a use of it.
				if (GRAB_CURSOR.test(stripSourceComments(source))) violations.push(rel)
			})
		}

		expect(
			violations,
			`files spelling a grab cursor (spread \`hannou.grab\` or \`hannou.grabCursor\` instead):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})

	it('closes the hand on data-dragging, never on :active', () => {
		for (const bundle of [hannou.grab, hannou.grabCursor]) {
			const classes = bundle.join(' ').split(/\s+/)

			expect(classes).toContain('data-[dragging]:cursor-grabbing')

			expect(classes.filter((name) => name.startsWith('active:'))).toEqual([])
		}

		expect(hannou.grab.join(' ')).toContain('touch-none')

		expect(hannou.grabCursor.join(' ')).not.toContain('touch-none')
	})
})
