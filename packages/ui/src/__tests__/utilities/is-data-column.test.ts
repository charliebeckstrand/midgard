// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { isDataColumn } from '../../utilities/is-data-column'

describe('isDataColumn', () => {
	it.each([
		['a plain content column', true, {}],
		['the selection-checkbox column', false, { selectable: true }],
		['the row-actions column', false, { actions: () => null }],
		['the row drag-handle column', false, { dragHandle: true }],
		['a column with selectable false', true, { selectable: false }],
		['a selectable column with actions', false, { selectable: true, actions: ['edit'] }],
	] as const)('reads %s as %s', (_, expected, column) => {
		expect(isDataColumn(column)).toBe(expected)
	})
})
