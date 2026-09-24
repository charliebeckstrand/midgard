import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { AreaChart, BarChart, ComboChart, LineChart } from '../../modules/chart'
import { renderUI } from '../helpers'

const DATA = [
	{ quarter: 'Q1', revenue: 40 },
	{ quarter: 'Q2', revenue: 80 },
]

const SERIES = [{ xKey: 'quarter', yKey: 'revenue', yName: 'Revenue' }] as const

const SELECTED = ['Q2']

// Each cartesian chart takes `selectedCategories` from the shared frame props.
// The chart reads it for the selection, and it must stop there: the rest of the
// props spreads onto the frame, which spreads onto a DOM element.
const CHARTS: [string, ReactElement][] = [
	[
		'BarChart',
		<BarChart
			key="bar"
			aria-label="Revenue"
			data={DATA}
			series={[...SERIES]}
			width={400}
			selectedCategories={SELECTED}
		/>,
	],
	[
		'LineChart',
		<LineChart
			key="line"
			aria-label="Revenue"
			data={DATA}
			series={[...SERIES]}
			width={400}
			selectedCategories={SELECTED}
		/>,
	],
	[
		'AreaChart',
		<AreaChart
			key="area"
			aria-label="Revenue"
			data={DATA}
			series={[...SERIES]}
			width={400}
			selectedCategories={SELECTED}
		/>,
	],
	[
		'ComboChart',
		<ComboChart
			key="combo"
			aria-label="Revenue"
			data={DATA}
			series={[{ type: 'bar', ...SERIES[0] }]}
			width={400}
			selectedCategories={SELECTED}
		/>,
	],
]

describe('selectedCategories', () => {
	it.each(CHARTS)('stays off the DOM in %s', (_, element) => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})

		const { container } = renderUI(element)

		const leaks = error.mock.calls.filter((call) => call.join(' ').includes('selectedCategories'))

		error.mockRestore()

		expect(leaks).toEqual([])

		expect(container.querySelector('[selectedcategories]')).toBeNull()
	})
})
