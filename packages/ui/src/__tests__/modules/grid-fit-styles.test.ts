// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { GridColumn } from '../../modules/grid'
import { fitHeaderProps } from '../../modules/grid/engine/grid-sizing/fit-styles'

type Row = { id: number }

describe('fitHeaderProps', () => {
	it('stops the least width of a column at its maxWidth', () => {
		const col: GridColumn<Row> = { id: 'name', title: 'Name', cell: () => 'a', maxWidth: 200 }

		// The least width holds the cell chrome around a leaf that asks for 200px.
		expect(fitHeaderProps(col, 216).style).toEqual({ '--grid-min': '200px' })
	})

	it('keeps a least width under the maxWidth', () => {
		const col: GridColumn<Row> = { id: 'name', title: 'Name', cell: () => 'a', maxWidth: 200 }

		expect(fitHeaderProps(col, 120).style).toEqual({ '--grid-min': '120px' })
	})
})
