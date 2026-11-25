import '../setup/grid-modules'
import { describe, expect, it } from 'vitest'
import { gridCases } from '../a11y/cases/grids'
import { rows } from '../a11y/cases/rows'
import { present, renderUI } from '../helpers'

/** The rows of `table` that assistive tech sees: none of a nested table, and none that is hidden. */
function exposedRows(table: HTMLTableElement): HTMLTableRowElement[] {
	return [...table.querySelectorAll('tr')].filter(
		(row) => row.closest('table') === table && !row.closest('[aria-hidden="true"]'),
	)
}

/** The value of a whole-number attribute, or `null` when the element has none. */
function intAttr(element: Element, name: string): number | null {
	const value = element.getAttribute(name)

	return value === null ? null : Number(value)
}

/** The cases that render each row of the set. The others render a window or a page. */
const COMPLETE = new Set([
	'grid, treegrid',
	'grid, master-detail',
	'grid, column groups',
	'grid, grand total',
])

/**
 * The treegrid cases whose rows state their place in their set. A client
 * grouping can window its rows, so it states the places from the full set.
 */
const PLACED = new Set(['grid, treegrid'])

/**
 * The row-count, row-index, and set invariants of the grid modes in the axe
 * corpus (`a11y/cases/grids.tsx`). The axe gate reads each attribute alone.
 * This gate reads the attributes against each other.
 */
describe('Grid ARIA invariants', () => {
	it.each(rows(gridCases))(
		'%s indexes each exposed row inside its row count',
		(name, { element }) => {
			const { container } = renderUI(element)

			const table = present<HTMLTableElement>(container.querySelector('table'), 'the table')

			const count = intAttr(table, 'aria-rowcount')

			const indices = exposedRows(table).map((row) => intAttr(row, 'aria-rowindex'))

			// A grid that states no count renders each row, and gives no row an index.
			if (count === null) {
				expect(indices.filter((index) => index !== null)).toEqual([])

				return
			}

			// Each exposed row takes an index, and the indices rise in the order of the DOM.
			expect(indices).not.toContain(null)

			for (let index = 1; index < indices.length; index++) {
				expect(indices[index]).toBeGreaterThan(indices[index - 1] as number)
			}

			expect(Math.max(...(indices as number[]))).toBeLessThanOrEqual(count as number)

			// A grid that renders each row indexes each place of its count one time.
			if (COMPLETE.has(name)) {
				expect(indices).toEqual(Array.from({ length: count as number }, (_, index) => index + 1))
			}
		},
	)

	it.each(rows(gridCases))('%s gives each treegrid row a place in its set', (name, { element }) => {
		const { container } = renderUI(element)

		const table = present<HTMLTableElement>(container.querySelector('table'), 'the table')

		const tree = exposedRows(table).filter((row) => row.hasAttribute('aria-level'))

		if (table.getAttribute('role') !== 'treegrid') {
			expect(tree).toEqual([])

			return
		}

		// A manual grouping renders each row, so assistive tech counts the
		// places itself, and the rows state none.
		if (!PLACED.has(name)) {
			expect(tree.filter((row) => row.hasAttribute('aria-posinset'))).toEqual([])

			return
		}

		const headers = tree.filter((row) => intAttr(row, 'aria-level') === 1)

		// The headers are one set, in order.
		expect(headers.map((row) => intAttr(row, 'aria-posinset'))).toEqual(
			headers.map((_, index) => index + 1),
		)

		for (const header of headers) {
			expect(intAttr(header, 'aria-setsize')).toBe(headers.length)
		}

		// The leaves under each header are one set, in order. A total is no member.
		const runs: HTMLTableRowElement[][] = []

		for (const row of tree) {
			if (intAttr(row, 'aria-level') === 1) runs.push([])
			else runs.at(-1)?.push(row)
		}

		for (const run of runs) {
			expect(run.map((row) => intAttr(row, 'aria-posinset'))).toEqual(
				run.map((_, index) => index + 1),
			)

			for (const leaf of run) expect(intAttr(leaf, 'aria-setsize')).toBe(run.length)
		}

		expect(table.querySelectorAll('tr[data-total-row="group"][aria-level]')).toHaveLength(0)
	})
})
