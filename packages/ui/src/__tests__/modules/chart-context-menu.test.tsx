import { describe, expect, it, vi } from 'vitest'
import { BarChart, PieChart } from '../../modules/chart'
import { readoutToCsv } from '../../modules/chart/engine/chart-export'
import { createHeaderActionsHost, HeaderActionsContext } from '../../primitives/header-actions'
import { bySlot, fireEvent, getSlot, renderUI, screen } from '../helpers'

type Row = { quarter: string; revenue: number }

const data: Row[] = [
	{ quarter: 'Q1', revenue: 10 },
	{ quarter: 'Q2', revenue: 20 },
]

const series = [{ xKey: 'quarter', yKey: 'revenue', yName: 'Revenue' } as const]

/** Right-clicks a chart's root region to open its context menu. */
function openChartMenu(container: HTMLElement): void {
	fireEvent.contextMenu(getSlot(container, 'chart'))
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
			'View data',
			'Download CSV',
			'Copy data',
		]) {
			expect(screen.getByRole('menuitem', { name })).toBeInTheDocument()
		}

		// Copy image is not a default action.
		expect(screen.queryByRole('menuitem', { name: 'Copy image' })).not.toBeInTheDocument()
	})

	it('drops the data actions from an empty pie', () => {
		const { container } = renderUI(
			<PieChart
				aria-label="Share"
				data={[] as Row[]}
				series={[{ xKey: 'quarter', yKey: 'revenue' }]}
				width={300}
			/>,
		)

		openChartMenu(container)

		expect(screen.getByRole('menuitem', { name: 'Download PNG' })).toBeInTheDocument()

		expect(screen.queryByRole('menuitem', { name: 'Download CSV' })).not.toBeInTheDocument()

		expect(screen.queryByRole('menuitem', { name: 'Copy data' })).not.toBeInTheDocument()
	})

	it('merges custom items and can hide the defaults', () => {
		const onInspect = vi.fn()

		const { container } = renderUI(
			<BarChart
				aria-label="Revenue by quarter"
				data={data}
				series={[...series]}
				contextMenu={{
					items: [{ key: 'inspect', label: 'Inspect', onAction: onInspect }],
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

	it('reports both ends of the fullscreen dialog, whatever drove them', () => {
		const onFullscreenChange = vi.fn()

		const { container } = renderUI(
			<BarChart
				aria-label="Revenue by quarter"
				title="Revenue by quarter"
				data={data}
				series={[...series]}
				contextMenu={{ onFullscreenChange }}
			/>,
		)

		openChartMenu(container)

		expect(onFullscreenChange).not.toHaveBeenCalled()

		fireEvent.click(screen.getByRole('menuitem', { name: 'Fullscreen' }))

		expect(onFullscreenChange).toHaveBeenCalledExactlyOnceWith(true)

		// A close the menu item never drove: the dialog's own dismissal.
		fireEvent.keyDown(document.body, { key: 'Escape' })

		expect(onFullscreenChange).toHaveBeenLastCalledWith(false)

		expect(onFullscreenChange).toHaveBeenCalledTimes(2)
	})

	it('reports the fullscreen close driven by the Close button', () => {
		const onFullscreenChange = vi.fn()

		const { container } = renderUI(
			<BarChart
				aria-label="Revenue by quarter"
				title="Revenue by quarter"
				data={data}
				series={[...series]}
				contextMenu={{ onFullscreenChange }}
			/>,
		)

		openChartMenu(container)

		fireEvent.click(screen.getByRole('menuitem', { name: 'Fullscreen' }))

		// The button dismisses through the panel's own `close()` rather than its own
		// handler, so it shares the route Escape takes.
		fireEvent.click(screen.getByRole('button', { name: 'Close' }))

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

		expect(onFullscreenChange).toHaveBeenLastCalledWith(false)

		expect(onFullscreenChange).toHaveBeenCalledTimes(2)
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

	it('opens the fullscreen dialog from the Fullscreen action, and closes it on Escape', () => {
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
		fireEvent.contextMenu(getSlot(container, 'chart'), { ctrlKey: true, button: 2 })

		expect(screen.queryByRole('menu')).not.toBeInTheDocument()
	})

	it('opens the chart menu on a Ctrl + click (button 0, macOS secondary click)', () => {
		const { container } = renderUI(
			<BarChart aria-label="Revenue by quarter" data={data} series={[...series]} />,
		)

		// A primary-button Ctrl+click is macOS's secondary click; it reaches the
		// chart menu rather than the native one, so Mac users get there too.
		fireEvent.contextMenu(getSlot(container, 'chart'), { ctrlKey: true, button: 0 })

		expect(screen.getByRole('menu')).toBeInTheDocument()
	})

	describe('function-form items (the right-clicked mark)', () => {
		it('builds the items from the mark under the pointer', () => {
			const items = vi.fn(({ index }: { index: number | null }) =>
				index === null ? [] : [{ key: 'drill', label: `Drill ${index}`, onAction: () => {} }],
			)

			const { container } = renderUI(
				<BarChart
					aria-label="Revenue by quarter"
					data={data}
					series={[...series]}
					contextMenu={{ items }}
				/>,
			)

			const root = getSlot(container, 'chart')

			// The frame snapshots the hovered index on the contextmenu capture phase;
			// with no mark hovered that snapshot is null, so a per-mark item is withheld.
			fireEvent.contextMenu(root)

			expect(items).toHaveBeenCalledWith({ index: null })

			expect(screen.queryByRole('menuitem', { name: /^Drill/ })).not.toBeInTheDocument()
		})

		it('still merges an array-form items block with the defaults', () => {
			const { container } = renderUI(
				<BarChart
					aria-label="Revenue by quarter"
					data={data}
					series={[...series]}
					contextMenu={{ items: [{ key: 'inspect', label: 'Inspect', onAction: () => {} }] }}
				/>,
			)

			openChartMenu(container)

			expect(screen.getByRole('menuitem', { name: 'Inspect' })).toBeInTheDocument()

			expect(screen.getByRole('menuitem', { name: 'Download PNG' })).toBeInTheDocument()
		})
	})

	// `ChartContextMenu` owns this rule for every host: it reads
	// `ChartFullscreenContext` and renders its children bare inside the dialog it
	// opened. Pinned here, on the `ChartFrame` path that the cartesian and sector
	// charts share, rather than in one chart type's own suite.
	it('opens a live fullscreen copy that does not nest a second menu', () => {
		const { container } = renderUI(
			<BarChart aria-label="Revenue by quarter" title="Revenue" data={data} series={[...series]} />,
		)

		openChartMenu(container)

		fireEvent.click(screen.getByRole('menuitem', { name: 'Fullscreen' }))

		const dialog = screen.getByRole('dialog')

		// The re-mounted copy renders bare, so a right-click inside it opens nothing.
		const inner = dialog.querySelector<HTMLElement>('[data-slot="chart"]')

		expect(inner).not.toBeNull()

		if (inner) fireEvent.contextMenu(inner)

		expect(screen.queryByRole('menu')).not.toBeInTheDocument()
	})
})

describe('readoutToCsv', () => {
	it('prefixes a quote to a formula-led category or series label', () => {
		const csv = readoutToCsv({
			categories: ['=HYPERLINK("http://evil.example","x")', '@SUM(A1)'],
			rows: [{ label: '+cmd', swatchClass: '', swatch: 'rect', values: ['1', '2'] }],
		})

		// A quoted cell whose first inner character is a formula lead is still a formula to a spreadsheet.
		expect(csv.split('\r\n')).toEqual([
			",'+cmd",
			'"\'=HYPERLINK(""http://evil.example"",""x"")",1',
			"'@SUM(A1),2",
		])
	})

	it('keeps a formatted negative number without a prefix, so the column still parses', () => {
		const csv = readoutToCsv({
			categories: ['Q1', 'Q2'],
			rows: [{ label: 'Margin', swatchClass: '', swatch: 'rect', values: ['-1,234.5', '-5'] }],
		})

		expect(csv.split('\r\n')).toEqual([',Margin', 'Q1,"-1,234.5"', 'Q2,-5'])
	})

	it('prefixes a quote to a number led by a tab or a carriage return', () => {
		const csv = readoutToCsv({
			categories: ['Q1', 'Q2'],
			rows: [{ label: 'Margin', swatchClass: '', swatch: 'rect', values: ['\t12', '+\r7'] }],
		})

		expect(csv.split('\r\n')).toEqual([',Margin', "Q1,'\t12", 'Q2,"\'+\r7"'])
	})
})

describe('ChartContextMenu target', () => {
	const DATA = [
		{ quarter: 'Q1', revenue: 40, costs: 24 },
		{ quarter: 'Q2', revenue: 80, costs: 31 },
		{ quarter: 'Q3', revenue: 65, costs: 28 },
	]

	it('reports no index for a right-click on bare plot above a bar', () => {
		const items = vi.fn(({ index }: { index: number | null }) =>
			index === null ? [] : [{ key: 'drill', label: `Drill ${index}`, onAction: () => {} }],
		)

		const { container } = renderUI(
			<BarChart
				aria-label="Revenue by quarter"
				data={DATA}
				series={[
					{ xKey: 'quarter', yKey: 'revenue', yName: 'Revenue' },
					{ xKey: 'quarter', yKey: 'costs', yName: 'Costs' },
				]}
				width={400}
				contextMenu={{ items }}
			/>,
		)

		const hit = getSlot(container, 'chart-hit')

		// The column of Q3, at the top of the plot: above both bars, on no mark.
		fireEvent.pointerMove(hit, { clientX: 280, clientY: 1 })

		expect(bySlot(container, 'tooltip-content')).toBeNull()

		fireEvent.contextMenu(hit)

		expect(items).toHaveBeenLastCalledWith({ index: null })

		expect(screen.queryByRole('menuitem', { name: /^Drill/ })).not.toBeInTheDocument()
	})

	it('shows the values in a table from View data', () => {
		const { container } = renderUI(
			<BarChart aria-label="Revenue by quarter" data={data} series={[...series]} />,
		)

		openChartMenu(container)

		fireEvent.click(screen.getByRole('menuitem', { name: 'View data' }))

		const dialog = screen.getByRole('dialog')

		expect(dialog).toHaveTextContent('Revenue by quarter')

		const rows = dialog.querySelectorAll('tbody tr')

		expect([...rows].map((row) => row.textContent)).toEqual(['Q110', 'Q220'])
	})
})

describe('Chart menu button', () => {
	it('sits at the end of the header of a titled chart', () => {
		const { container } = renderUI(
			<BarChart
				title="Revenue"
				aria-label="Revenue"
				data={data}
				series={[...series]}
				width={400}
			/>,
		)

		const button = getSlot(container, 'chart-menu-button')

		expect(bySlot(container, 'chart-header')?.contains(button)).toBe(true)

		fireEvent.click(button.querySelector('button') as Element)

		expect(screen.getByRole('menuitem', { name: 'View data' })).toBeInTheDocument()
	})

	it('goes to the header actions of the box around the chart', () => {
		const host = document.createElement('div')

		document.body.append(host)

		const slot = createHeaderActionsHost()

		slot.set(host)

		const { container } = renderUI(
			<HeaderActionsContext value={slot}>
				<BarChart title="Revenue" aria-label="Revenue" data={data} series={[...series]} />
			</HeaderActionsContext>,
		)

		expect(bySlot(container, 'chart-menu-button')).toBeNull()

		expect(bySlot(host, 'chart-menu-button')).not.toBeNull()

		host.remove()
	})

	it('puts a View data button in the header row of a box, and marks its own fullscreen', () => {
		const host = document.createElement('div')

		document.body.append(host)

		const slot = createHeaderActionsHost()

		slot.set(host)

		renderUI(
			<HeaderActionsContext value={slot}>
				<BarChart title="Revenue" aria-label="Revenue" data={data} series={[...series]} />
			</HeaderActionsContext>,
		)

		// The box hides its own expand control, because the chart menu has Fullscreen.
		expect(getSlot(host, 'chart-header-actions')).toHaveAttribute('data-own-fullscreen')

		fireEvent.click(screen.getByRole('button', { name: 'View data for Revenue' }))

		expect(screen.getByRole('dialog')).toBeInTheDocument()

		host.remove()
	})

	it('shows no View data button outside a box', () => {
		renderUI(<BarChart title="Revenue" aria-label="Revenue" data={data} series={[...series]} />)

		expect(screen.queryByRole('button', { name: 'View data for Revenue' })).toBeNull()
	})

	it('shows none on an untitled chart outside a box, or with the menu off', () => {
		const untitled = renderUI(<BarChart aria-label="Revenue" data={data} series={[...series]} />)

		expect(bySlot(untitled.container, 'chart-menu-button')).toBeNull()

		const off = renderUI(
			<BarChart
				title="Revenue"
				aria-label="Revenue"
				data={data}
				series={[...series]}
				contextMenu={false}
			/>,
		)

		expect(bySlot(off.container, 'chart-menu-button')).toBeNull()
	})
})
