import { describe, expect, it, vi } from 'vitest'
import { BarChart } from '../../modules/chart'
import { bySlot, fireEvent, renderUI, screen } from '../helpers'

type Row = { quarter: string; revenue: number }

const data: Row[] = [
	{ quarter: 'Q1', revenue: 10 },
	{ quarter: 'Q2', revenue: 20 },
]

const series = [{ xKey: 'quarter', yKey: 'revenue', yName: 'Revenue' } as const]

/** Right-clicks a chart's root region to open its context menu. */
function openChartMenu(container: HTMLElement): void {
	const root = bySlot(container, 'chart')

	if (!root) throw new Error('no chart root')

	fireEvent.contextMenu(root)
}

describe('Chart context menu', () => {
	it('offers the default actions on a right-click', () => {
		const { container } = renderUI(
			<BarChart aria-label="Revenue by quarter" data={data} series={[...series]} />,
		)

		expect(screen.queryByRole('menu')).not.toBeInTheDocument()

		openChartMenu(container)

		for (const name of [
			'Fullscreen',
			'Download PNG',
			'Download JPG',
			'Download CSV',
			'Copy data',
		]) {
			expect(screen.getByRole('menuitem', { name })).toBeInTheDocument()
		}
	})

	it('merges custom items and can hide the defaults', () => {
		const onInspect = vi.fn()

		const { container } = renderUI(
			<BarChart
				aria-label="Revenue by quarter"
				data={data}
				series={[...series]}
				contextMenu={{
					items: [{ key: 'inspect', label: 'Inspect', onSelect: onInspect }],
					defaultItems: false,
				}}
			/>,
		)

		openChartMenu(container)

		expect(screen.getByRole('menuitem', { name: 'Inspect' })).toBeInTheDocument()

		expect(screen.queryByRole('menuitem', { name: 'Fullscreen' })).not.toBeInTheDocument()

		fireEvent.click(screen.getByRole('menuitem', { name: 'Inspect' }))

		expect(onInspect).toHaveBeenCalledOnce()
	})

	it('opens the fullscreen dialog from the Fullscreen action', () => {
		const { container } = renderUI(
			<BarChart
				aria-label="Revenue by quarter"
				title="Revenue by quarter"
				data={data}
				series={[...series]}
			/>,
		)

		openChartMenu(container)

		fireEvent.click(screen.getByRole('menuitem', { name: 'Fullscreen' }))

		expect(screen.getByRole('dialog')).toBeInTheDocument()
	})

	it('leaves the native menu with contextMenu={false}', () => {
		const { container } = renderUI(
			<BarChart
				aria-label="Revenue by quarter"
				data={data}
				series={[...series]}
				contextMenu={false}
			/>,
		)

		openChartMenu(container)

		expect(screen.queryByRole('menu')).not.toBeInTheDocument()
	})
})
