import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GridColumn } from '../../modules/grid'
import { measureColumns } from '../../modules/grid/engine/grid-sizing/measure'

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
})
