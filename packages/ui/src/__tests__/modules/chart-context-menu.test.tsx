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

		// Copy image is not a default action.
		expect(screen.queryByRole('menuitem', { name: 'Copy image' })).not.toBeInTheDocument()
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

	it('seats initial focus on Close so the fullscreen dialog opens with a tab stop', () => {
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

		expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()
	})

	it('closes the fullscreen dialog on Escape', () => {
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

		fireEvent.keyDown(document.body, { key: 'Escape' })

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})

	it('renders the fullscreen chart at a definite ratio even when the source fills', () => {
		// A fill-mode source (`aspectRatio={false}`) fills its parent's height; the
		// auto-height fullscreen dialog gives it none, collapsing the plot. The
		// fullscreen copy must fall back to the default ratio so it reserves height.
		const { container } = renderUI(
			<BarChart
				aria-label="Revenue by quarter"
				title="Revenue by quarter"
				data={data}
				series={[...series]}
				aspectRatio={false}
			/>,
		)

		openChartMenu(container)

		fireEvent.click(screen.getByRole('menuitem', { name: 'Fullscreen' }))

		const dialog = screen.getByRole('dialog')
		const figure = dialog.querySelector<HTMLElement>('[data-slot="chart-figure"]')

		expect(figure).not.toBeNull()
		// The default 16/9 rides `aspect-ratio`; a still-filling copy would carry none.
		expect(figure?.style.aspectRatio).not.toBe('')
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

	it('defers to the native menu on a Ctrl + right-click (button 2)', () => {
		const { container } = renderUI(
			<BarChart aria-label="Revenue by quarter" data={data} series={[...series]} />,
		)

		// The secondary button held with Ctrl is the escape hatch to the browser
		// menu — the same one the grid uses (via isNativeContextMenuRequest).
		fireEvent.contextMenu(bySlot(container, 'chart') ?? container, { ctrlKey: true, button: 2 })

		expect(screen.queryByRole('menu')).not.toBeInTheDocument()
	})

	it('opens the chart menu on a Ctrl + click (button 0, macOS secondary click)', () => {
		const { container } = renderUI(
			<BarChart aria-label="Revenue by quarter" data={data} series={[...series]} />,
		)

		// A primary-button Ctrl+click is macOS's secondary click; it reaches the
		// chart menu rather than the native one, so Mac users get there too.
		fireEvent.contextMenu(bySlot(container, 'chart') ?? container, { ctrlKey: true, button: 0 })

		expect(screen.getByRole('menu')).toBeInTheDocument()
	})
})
