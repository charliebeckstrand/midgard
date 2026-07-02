import { describe, expect, it } from 'vitest'
import { isDataColumn } from '../../utilities/is-data-column'

describe('isDataColumn', () => {
	it('is true for a plain content column', () => {
		expect(isDataColumn({})).toBe(true)
	})

	it('is false for the selection-checkbox column', () => {
		expect(isDataColumn({ selectable: true })).toBe(false)
	})

	it('is false for the row-actions column', () => {
		expect(isDataColumn({ actions: () => null })).toBe(false)
	})

	it('is false for the row drag-handle column', () => {
		expect(isDataColumn({ dragHandle: true })).toBe(false)
	})

	it('is true when selectable is explicitly false and actions is absent', () => {
		expect(isDataColumn({ selectable: false })).toBe(true)
	})

	it('is false for a column that is both selectable and carries actions', () => {
		expect(isDataColumn({ selectable: true, actions: ['edit'] })).toBe(false)
	})
})
