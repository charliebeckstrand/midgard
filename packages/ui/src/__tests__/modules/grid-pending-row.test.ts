// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { pendingRow } from '../../modules/grid/grid-editing-cell'

type Row = { id: number; name: string }

describe('pendingRow', () => {
	it('copies a frozen row with the committed value in the field', () => {
		const row: Row = Object.freeze({ id: 1, name: 'Ada' })

		const copy = pendingRow(row, { id: 'name', field: 'name' }, 'Grace')

		expect(copy).not.toBe(row)

		expect(copy).toEqual({ id: 1, name: 'Grace' })

		expect(row.name).toBe('Ada')
	})

	it('copies a sealed row with the committed value in the field', () => {
		const row: Row = Object.seal({ id: 1, name: 'Ada' })

		expect(pendingRow(row, { id: 'name', field: 'name' }, 'Grace').name).toBe('Grace')
	})
})
