import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { usePivotTable } from '../../components/pivot-table/use-pivot-table'

type Row = { region: string; quarter: string; revenue: number }

const data: Row[] = [
	{ region: 'NA', quarter: 'Q1', revenue: 100 },
	{ region: 'NA', quarter: 'Q2', revenue: 50 },
	{ region: 'EU', quarter: 'Q1', revenue: 75 },
	{ region: 'EU', quarter: 'Q2', revenue: 125 },
]

const keys = { row: 'region', column: 'quarter', value: 'revenue' } as const

describe('usePivotTable', () => {
	it('derives the row and column axes from the data', () => {
		const { result } = renderHook(() => usePivotTable(data, keys))

		expect(result.current.rowKeys).toEqual(expect.arrayContaining(['NA', 'EU']))

		expect(result.current.columnKeys).toEqual(expect.arrayContaining(['Q1', 'Q2']))
	})

	it('honors an explicit rowOrder and columnOrder', () => {
		const { result } = renderHook(() =>
			usePivotTable(data, keys, { rowOrder: ['EU', 'NA'], columnOrder: ['Q2', 'Q1'] }),
		)

		expect(result.current.rowKeys).toEqual(['EU', 'NA'])

		expect(result.current.columnKeys).toEqual(['Q2', 'Q1'])
	})

	it('aggregates cell values by sum by default', () => {
		const { result } = renderHook(() => usePivotTable(data, keys))

		expect(result.current.cellValue('NA', 'Q1')).toBe(100)

		expect(result.current.cellValue('NA', 'Q2')).toBe(50)
	})

	it('returns undefined for empty cells', () => {
		const { result } = renderHook(() => usePivotTable(data, keys))

		expect(result.current.cellValue('NA', 'unknown')).toBeUndefined()
	})

	it('computes row totals, column totals, and the grand total', () => {
		const { result } = renderHook(() => usePivotTable(data, keys))

		expect(result.current.rowTotal('NA')).toBe(150)

		expect(result.current.colTotals).toEqual(expect.arrayContaining([175, 175]))

		expect(result.current.grandTotal).toBe(350)
	})

	it('respects the aggregation option for cell, row, and grand totals', () => {
		const { result } = renderHook(() => usePivotTable(data, keys, { aggregation: 'count' }))

		expect(result.current.cellValue('NA', 'Q1')).toBe(1)

		expect(result.current.rowTotal('NA')).toBe(2)

		expect(result.current.grandTotal).toBe(4)
	})
})
