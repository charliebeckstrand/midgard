import { describe, expect, it } from 'vitest'
import { BarChart, PieChart } from '../../modules/chart'
import { resolveHeader } from '../../modules/chart/chart-schema'
import { bySlot, renderUI } from '../helpers'

const ROWS = [
	{ q: 'Q1', rev: 4 },
	{ q: 'Q2', rev: 7 },
]

const SHARES = [
	{ source: 'Direct', visits: 6 },
	{ source: 'Search', visits: 4 },
]

describe('resolveHeader', () => {
	it('reads a string as a bare title and passes the object form through', () => {
		expect(resolveHeader(undefined)).toEqual({})

		expect(resolveHeader('Revenue')).toEqual({ title: 'Revenue' })

		expect(resolveHeader({ title: 'Revenue', subtitle: 'FY25' })).toEqual({
			title: 'Revenue',
			subtitle: 'FY25',
		})
	})
})

describe('chart header prop', () => {
	it('renders the string shorthand as the title line', () => {
		const { container } = renderUI(
			<BarChart
				aria-label="Revenue"
				header="Revenue"
				data={ROWS}
				series={[{ xKey: 'q', yKey: 'rev' }]}
				width={600}
			/>,
		)

		expect(bySlot(container, 'chart-title')?.textContent).toBe('Revenue')
	})

	it('renders title, subtitle, and both adornments from the object form', () => {
		const { container } = renderUI(
			<BarChart
				aria-label="Revenue"
				header={{
					title: 'Revenue',
					subtitle: 'FY25',
					prefix: <span data-testid="dot" />,
					suffix: <button type="button">Menu</button>,
				}}
				data={ROWS}
				series={[{ xKey: 'q', yKey: 'rev' }]}
				width={600}
			/>,
		)

		expect(bySlot(container, 'chart-title')?.textContent).toBe('Revenue')

		expect(bySlot(container, 'chart-subtitle')?.textContent).toBe('FY25')

		expect(bySlot(container, 'chart-header-prefix')).not.toBeNull()

		expect(bySlot(container, 'chart-header-suffix')?.textContent).toBe('Menu')
	})

	it('renders a header row with no title lines for an adornment-only config', () => {
		const { container } = renderUI(
			<BarChart
				aria-label="Revenue"
				header={{ suffix: <button type="button">Menu</button> }}
				data={ROWS}
				series={[{ xKey: 'q', yKey: 'rev' }]}
				width={600}
			/>,
		)

		expect(bySlot(container, 'chart-header')).not.toBeNull()

		expect(bySlot(container, 'chart-title')).toBeNull()
	})

	it('renders no header without the prop', () => {
		const { container } = renderUI(
			<BarChart
				aria-label="Revenue"
				data={ROWS}
				series={[{ xKey: 'q', yKey: 'rev' }]}
				width={600}
			/>,
		)

		expect(bySlot(container, 'chart-header')).toBeNull()
	})

	it('gives a pie the same header a cartesian chart wears', () => {
		const { container } = renderUI(
			<PieChart
				aria-label="Traffic by source"
				header={{ title: 'Traffic', subtitle: 'This week' }}
				data={SHARES}
				series={[{ xKey: 'source', yKey: 'visits' }]}
				width={480}
			/>,
		)

		expect(bySlot(container, 'chart-title')?.textContent).toBe('Traffic')

		expect(bySlot(container, 'chart-subtitle')?.textContent).toBe('This week')
	})
})
