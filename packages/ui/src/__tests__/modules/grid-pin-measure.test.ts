import { describe, expect, it } from 'vitest'
import {
	type FrozenCell,
	frozenHeaderCells,
	frozenOffsets,
	sameFrozenOffsets,
} from '../../modules/grid/engine/grid-pin/measure'
import type { GridColumn } from '../../modules/grid/types'

/**
 * The frozen-column measurement the sticky offsets read where the engine's size
 * model does not set the rendered widths (an auto-layout grid). jsdom paints no
 * layout, so the header cells' widths are stubbed; the scan and the accumulation
 * are what these assert, and the browser suite covers the real geometry.
 */
describe('frozen column measurement', () => {
	type Row = { id: number }

	const columns: GridColumn<Row>[] = [
		{ id: 'select', selectable: true },
		{ id: 'name', title: 'Name' },
		{ id: 'code', title: 'Code' },
		{ id: 'a', title: 'A' },
		{ id: 'b', title: 'B' },
		{ id: 'c', title: 'C' },
	]

	const sides: Record<string, 'left' | 'right' | undefined> = {
		select: 'left',
		name: 'left',
		code: 'left',
		c: 'right',
	}

	const side = (id: string | number) => sides[String(id)]

	/** A container holding one header row of `widths.length` cells at those widths. */
	function render(widths: number[], options: { band?: boolean } = {}): HTMLElement {
		const container = document.createElement('div')

		container.innerHTML = `<table><thead>${
			options.band ? '<tr><th colspan="6"></th></tr>' : ''
		}<tr>${widths.map(() => '<th></th>').join('')}</tr></thead></table>`

		const cells = [...container.querySelectorAll('th')]

		// The band row's cell carries no column id, so only the column-header row's
		// data columns are marked — the anchor the scan resolves that row through.
		const headerCells = options.band ? cells.slice(1) : cells

		headerCells.forEach((cell, index) => {
			const column = columns[index]

			if (column && column.id !== 'select') cell.setAttribute('data-grid-col', String(column.id))

			cell.getBoundingClientRect = () => ({ width: widths[index] ?? 0 }) as DOMRect
		})

		return container
	}

	it('scans the frozen columns out of the header row in visible order', () => {
		const frozen = frozenHeaderCells(render([48, 100, 90, 40, 40, 60]), columns, side)

		expect(frozen.map((entry) => [entry.id, entry.side])).toEqual([
			['select', 'left'],
			['name', 'left'],
			['code', 'left'],
			['c', 'right'],
		])
	})

	it('resolves the column-header row beneath a column-group band row', () => {
		const frozen = frozenHeaderCells(
			render([48, 100, 90, 40, 40, 60], { band: true }),
			columns,
			side,
		)

		// The band row leads the `<thead>` and carries no column id, so the scan lands
		// on the column-header row below it and reads its widths, not the band's span.
		expect(frozen.map((entry) => entry.id)).toEqual(['select', 'name', 'code', 'c'])
	})

	it('stacks each frozen column after the ones between it and its edge', () => {
		const offsets = frozenOffsets(
			frozenHeaderCells(render([48, 100, 90, 40, 40, 60]), columns, side),
		)

		// Left: the selection column leads at the edge, then each stacks by the
		// rendered width of the ones ahead of it.
		expect([...offsets.left]).toEqual([
			['select', 0],
			['name', 48],
			['code', 148],
		])

		// The lone right-frozen column sits flush against the right edge.
		expect([...offsets.right]).toEqual([['c', 0]])
	})

	it('stacks right-frozen columns inward from the right edge', () => {
		const rightSides: Record<string, 'left' | 'right' | undefined> = { b: 'right', c: 'right' }

		const frozen = frozenHeaderCells(
			render([48, 100, 90, 40, 40, 60]),
			columns,
			(id) => rightSides[String(id)],
		)

		// `c` is rightmost, so it holds the edge; `b` stacks inward by c's 60px.
		expect([...frozenOffsets(frozen).right]).toEqual([
			['c', 0],
			['b', 60],
		])
	})

	it('reads nothing from a header whose cell count does not match the columns', () => {
		// A header caught mid column change measures nothing rather than mis-indexing
		// the columns onto the wrong cells.
		expect(frozenHeaderCells(render([48, 100]), columns, side)).toEqual([])

		expect(frozenHeaderCells(document.createElement('div'), columns, side)).toEqual([])
	})

	it('holds a measurement equal when every frozen column lands on the same pixel', () => {
		const measure = () =>
			frozenOffsets(frozenHeaderCells(render([48, 100, 90, 40, 40, 60]), columns, side))

		expect(sameFrozenOffsets(measure(), measure())).toBe(true)

		// A frozen column that changed width moves the ones behind it.
		const moved = frozenOffsets(frozenHeaderCells(render([48, 120, 90, 40, 40, 60]), columns, side))

		expect(sameFrozenOffsets(measure(), moved)).toBe(false)

		// No prior measurement is never equal.
		expect(sameFrozenOffsets(null, measure())).toBe(false)
	})

	it('accumulates only across the cells it is handed', () => {
		// The accumulation is the pure half of the measurement, so it reads any
		// supplied cell set — the hook hands it the scan's output.
		const cell = (width: number) =>
			({ getBoundingClientRect: () => ({ width }) }) as unknown as HTMLElement

		const cells: FrozenCell[] = [
			{ id: 'one', side: 'left', cell: cell(30) },
			{ id: 'two', side: 'left', cell: cell(70) },
		]

		expect([...frozenOffsets(cells).left]).toEqual([
			['one', 0],
			['two', 30],
		])
	})
})
