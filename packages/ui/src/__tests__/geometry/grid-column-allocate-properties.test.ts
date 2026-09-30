// @vitest-environment node
import { fc, test } from '@fast-check/vitest'
import { describe, expect } from 'vitest'
import {
	allocateColumnWidths,
	type ColumnSizeProfile,
} from '../../modules/grid/engine/grid-sizing/allocate'

// The tables of `grid-column-allocate.test.ts` hold the documented examples.
// The properties below read the allocator over generated profiles.
//
// The measurer gives whole pixels, and the caller subtracts whole pixels from
// the width of the grid. Thus each bound and the available width are integers.

/** The ceiling of a column with no `maxWidth`, as the measurer emits it. */
const UNBOUNDED = Number.MAX_SAFE_INTEGER

const profiles = () =>
	fc
		.array(
			fc.record({
				min: fc.nat({ max: 200 }),
				room: fc.oneof(fc.nat({ max: 300 }), fc.constant(Number.POSITIVE_INFINITY)),
				content: fc.nat({ max: 600 }),
				frozen: fc.nat({ max: 3 }).map((roll) => roll === 0),
			}),
			{ minLength: 1, maxLength: 8 },
		)
		.map((columns) =>
			columns.map(
				({ min, room, content, frozen }, index): ColumnSizeProfile => ({
					id: `c${index}`,
					min,
					content,
					max: Number.isFinite(room) ? min + room : UNBOUNDED,
					...(frozen && { frozen }),
				}),
			),
		)

const available = () => fc.integer({ min: -100, max: 4000 })

/** The width that a column asks for: its content inside its bounds. */
const desiredOf = (column: ColumnSizeProfile) =>
	Math.min(column.max, Math.max(column.min, column.content))

/** The sum of the widths of an allocation. */
const total = (widths: Record<string, number>) =>
	Object.values(widths).reduce((sum, width) => sum + width, 0)

describe('allocateColumnWidths · properties', () => {
	test.prop([profiles(), available()])(
		'gives each column one whole-pixel width inside its bounds',
		(columns, space) => {
			const widths = allocateColumnWidths(columns, space)

			expect(Object.keys(widths).toSorted()).toEqual(columns.map((column) => column.id).toSorted())

			for (const column of columns) {
				const width = widths[column.id] as number

				expect(Number.isInteger(width)).toBe(true)

				expect(width).toBeGreaterThanOrEqual(column.min)

				expect(width).toBeLessThanOrEqual(column.max)
			}
		},
	)

	// The widths sum to the space that the table takes: the desired widths in a
	// deficit, the available width in a surplus, and the ceilings when they cap
	// out first.
	test.prop([profiles(), available()])(
		'sums to exactly the space that the columns take',
		(columns, space) => {
			const desired = columns.reduce((sum, column) => sum + desiredOf(column), 0)

			const ceiling = columns.reduce(
				(sum, column) => sum + (column.frozen ? desiredOf(column) : column.max),
				0,
			)

			const expected = space <= 0 || desired >= space ? desired : Math.min(space, ceiling)

			expect(total(allocateColumnWidths(columns, space))).toBe(expected)
		},
	)

	test.prop([profiles(), available()])(
		'holds each column at its content width when the space runs short',
		(columns, space) => {
			const desired = columns.reduce((sum, column) => sum + desiredOf(column), 0)

			fc.pre(space <= 0 || desired >= space)

			const widths = allocateColumnWidths(columns, space)

			for (const column of columns) expect(widths[column.id]).toBe(desiredOf(column))
		},
	)

	test.prop([profiles(), available()])(
		'holds a frozen column at its content width, and lifts no other one below it',
		(columns, space) => {
			const widths = allocateColumnWidths(columns, space)

			for (const column of columns) {
				const width = widths[column.id] as number

				if (column.frozen) expect(width).toBe(desiredOf(column))
				else expect(width).toBeGreaterThanOrEqual(desiredOf(column))
			}
		},
	)

	// The surplus lifts the narrowest columns to one common level. The integer
	// rounding can leave one pixel between two lifted columns. No lifted
	// column passes a column that keeps its content width by more than a pixel.
	test.prop([profiles(), available()])(
		'lifts the narrowest columns to one level, within a pixel',
		(columns, space) => {
			const widths = allocateColumnWidths(columns, space)

			const scrolling = columns.filter((column) => !column.frozen)

			const lifted = scrolling.filter((column) => {
				const width = widths[column.id] as number

				return width > desiredOf(column) && width < column.max
			})

			const liftedWidths = lifted.map((column) => widths[column.id] as number)

			if (liftedWidths.length > 0) {
				expect(Math.max(...liftedWidths) - Math.min(...liftedWidths)).toBeLessThanOrEqual(1)
			}

			for (const column of scrolling) {
				// A column at its ceiling stops for the ceiling, not for its content.
				if (widths[column.id] !== desiredOf(column) || desiredOf(column) >= column.max) continue

				for (const width of liftedWidths) {
					expect(width).toBeLessThanOrEqual(desiredOf(column) + 1)
				}
			}
		},
	)
})
