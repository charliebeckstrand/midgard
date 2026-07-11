import { describe, expect, it } from 'vitest'
import { minColumns } from '../../modules/dashboard/dashboard-constraints'

describe('minColumns', () => {
	it('covers the minimum width plus one gap, rounded up to whole columns', () => {
		// 25px a column; 400px + one 8px gap is 408px, which needs 17 columns.
		expect(minColumns(400, 8, 25, 24)).toBe(17)
	})

	it('never floors below a single column', () => {
		expect(minColumns(10, 8, 200, 24)).toBe(1)
	})

	it('never exceeds the column count, however starved the pitch', () => {
		expect(minColumns(4000, 8, 10, 24)).toBe(24)
	})
})
