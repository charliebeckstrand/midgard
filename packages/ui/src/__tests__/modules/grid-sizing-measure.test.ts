import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GridColumn } from '../../modules/grid'
import { measureColumns } from '../../modules/grid/engine/grid-sizing/measure'
import { present } from '../helpers'

type Row = { id: number }

const columns: GridColumn<Row>[] = [{ id: 'a', title: 'A', cell: () => 'a' }]

/** A header and `count` text body cells for column `a`, in one table. */
function table(count: number): HTMLElement {
	const container = document.createElement('div')

	const cells = Array.from(
		{ length: count },
		(_, i) => `<tr><td data-grid-col="a"><span data-grid-content>Value ${i}</span></td></tr>`,
	).join('')

	container.innerHTML = `<table><thead><tr><th data-grid-col="a"><span data-grid-content>A</span></th></tr></thead><tbody>${cells}</tbody></table>`

	document.body.append(container)

	return container
}

describe('measureColumns', () => {
	afterEach(() => {
		document.body.innerHTML = ''

		vi.restoreAllMocks()
	})

	it('reads every intrinsic width through one Range, and releases it after each pass', () => {
		const create = vi.spyOn(document, 'createRange')

		const container = table(20)

		measureColumns({ columns, container, scan: new Set(['a']) })

		measureColumns({ columns, container, scan: new Set(['a']) })

		// 42 reads (a title and 20 cells, twice) share the one lazy Range.
		expect(create).toHaveBeenCalledTimes(1)

		// The pass collapses the Range to the document start, so it holds no node
		// of the grid after it.
		const range = create.mock.results[0]?.value as Range | undefined

		expect(range?.collapsed).toBe(true)

		expect(range?.startContainer).toBe(document)
	})

	// A detail panel can hold a nested grid, and a column id can be the same in
	// the two grids. The pass must read only the cells of its own grid. The cells
	// have no content leaf, so the pass reads them with no `Range`, and the case
	// above keeps its count of `createRange` calls in each order.
	it('reads no header or body cell of a grid nested in a detail row', () => {
		const container = document.createElement('div')

		container.innerHTML =
			'<table><thead><tr><th data-grid-col="a"></th></tr></thead><tbody>' +
			'<tr><td data-grid-col="a"></td></tr>' +
			'<tr data-detail-row="1"><td><table>' +
			'<thead><tr><th data-grid-col="a" data-nested></th></tr></thead>' +
			'<tbody><tr><td data-grid-col="a" data-nested></td></tr></tbody>' +
			'</table></td></tr>' +
			'</tbody></table>'

		document.body.append(container)

		const width = (selector: string, value: number) => {
			Object.defineProperty(present(container.querySelector(selector), selector), 'scrollWidth', {
				value,
			})
		}

		width('td:not([data-nested])', 60)

		width('td[data-nested]', 400)

		const reads = vi.spyOn(Element.prototype, 'getBoundingClientRect')

		const measurement = measureColumns({ columns, container, scan: new Set(['a']) })

		expect(measurement.cells).toBe(1)

		expect(measurement.bodies.get('a')).toBe(60)

		// The floor of the column reads its own header, not the nested one.
		expect(reads.mock.contexts).toContain(container.querySelector('th:not([data-nested])'))

		expect(reads.mock.contexts).not.toContain(container.querySelector('th[data-nested]'))
	})
})
