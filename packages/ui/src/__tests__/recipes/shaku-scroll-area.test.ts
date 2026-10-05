// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { shaku } from '../../recipes/kiso/shaku'

const { scrollArea } = shaku

/** The classes of one extent, split on space. */
const classesOf = (value: string) => value.split(' ')

/** Whether `classes` holds a height class, such as `h-48` or `h-[100dvw]`. */
const setsHeight = (classes: string[]) => classes.some((name) => name.startsWith('h-'))

/** Whether `classes` holds a width class, such as `w-96` or `w-[100dvh]`. */
const setsWidth = (classes: string[]) => classes.some((name) => name.startsWith('w-'))

/**
 * The `extent` TSDoc gives the rule: the size of the frame on the axis that
 * scrolls. Each step, `dvh` and `dvw` too, sets only the scroll axis. A width
 * never exceeds the parent, so each width class takes `max-w-full`.
 */
describe('shaku scroll-area extents', () => {
	it('sizes only the height of a vertical area', () => {
		for (const [extent, value] of Object.entries(scrollArea.vertical)) {
			const classes = classesOf(value)

			expect(setsHeight(classes), extent).toBe(true)

			expect(setsWidth(classes), extent).toBe(false)
		}
	})

	it('sizes only the width of a horizontal area', () => {
		for (const [extent, value] of Object.entries(scrollArea.horizontal)) {
			const classes = classesOf(value)

			expect(setsWidth(classes), extent).toBe(true)

			expect(setsHeight(classes), extent).toBe(false)
		}
	})

	it('caps each width at the width of the parent', () => {
		for (const orientation of ['vertical', 'horizontal', 'both'] as const) {
			for (const [extent, value] of Object.entries(scrollArea[orientation])) {
				const classes = classesOf(value)

				if (setsWidth(classes)) expect(classes, `${orientation} ${extent}`).toContain('max-w-full')
			}
		}
	})
})
