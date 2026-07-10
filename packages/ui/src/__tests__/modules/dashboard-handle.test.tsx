import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BarChart } from '../../modules/chart'
import { DashboardGrid, DashboardItem } from '../../modules/dashboard'
import { allBySlot, bySlot, renderUI } from '../helpers'

const ROWS = [
	{ q: 'Q1', rev: 4 },
	{ q: 'Q2', rev: 7 },
]

/** A one-tile editing board around arbitrary content. */
function board(children: React.ReactNode) {
	return (
		<DashboardGrid
			aria-label="Sales"
			editing
			layout={{ value: [{ id: 'tile', x: 0, y: 0, w: 12 }] }}
		>
			<DashboardItem id="tile" ratio={16 / 9}>
				{children}
			</DashboardItem>
		</DashboardGrid>
	)
}

const originalClientWidth = Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth')

beforeEach(() => {
	Object.defineProperty(Element.prototype, 'clientWidth', {
		configurable: true,
		get: () => 960,
	})
})

afterEach(() => {
	if (originalClientWidth) {
		Object.defineProperty(Element.prototype, 'clientWidth', originalClientWidth)
	}
})

describe('dashboard drag-handle adoption', () => {
	it('a chart header claims the handle, standing the floating fallback down', () => {
		const { container } = renderUI(
			board(
				<BarChart
					aria-label="Revenue"
					header="Revenue"
					data={ROWS}
					series={[{ xKey: 'q', yKey: 'rev' }]}
					width={600}
				/>,
			),
		)

		const handles = allBySlot(container, 'dashboard-handle')

		expect(handles).toHaveLength(1)

		// The one handle sits inside the chart's header, not floated on the tile.
		expect(handles[0]?.closest('[data-slot="chart-header"]')).not.toBeNull()

		expect(bySlot(container, 'chart-header-handle')).not.toBeNull()
	})

	it('content with no adopter gets the floating fallback', () => {
		const { container } = renderUI(board(<div data-testid="plain" />))

		const handles = allBySlot(container, 'dashboard-handle')

		expect(handles).toHaveLength(1)

		expect(handles[0]?.closest('[data-slot="chart-header"]')).toBeNull()
	})

	it('a chart without a header leaves the fallback standing', () => {
		const { container } = renderUI(
			board(
				<BarChart
					aria-label="Revenue"
					data={ROWS}
					series={[{ xKey: 'q', yKey: 'rev' }]}
					width={600}
				/>,
			),
		)

		const handles = allBySlot(container, 'dashboard-handle')

		expect(handles).toHaveLength(1)

		expect(handles[0]?.closest('[data-slot="chart-header"]')).toBeNull()
	})

	it('claims stay balanced under StrictMode double-mounting', () => {
		const { container } = renderUI(
			<StrictMode>
				{board(
					<BarChart
						aria-label="Revenue"
						header="Revenue"
						data={ROWS}
						series={[{ xKey: 'q', yKey: 'rev' }]}
						width={600}
					/>,
				)}
			</StrictMode>,
		)

		expect(allBySlot(container, 'dashboard-handle')).toHaveLength(1)

		expect(bySlot(container, 'chart-header-handle')).not.toBeNull()
	})

	it('renders no handle at all outside editing mode', () => {
		const { container } = renderUI(
			<DashboardGrid aria-label="Sales" layout={{ value: [{ id: 'tile', x: 0, y: 0, w: 12 }] }}>
				<DashboardItem id="tile" ratio={16 / 9}>
					<BarChart
						aria-label="Revenue"
						header="Revenue"
						data={ROWS}
						series={[{ xKey: 'q', yKey: 'rev' }]}
						width={600}
					/>
				</DashboardItem>
			</DashboardGrid>,
		)

		expect(bySlot(container, 'dashboard-handle')).toBeNull()

		expect(bySlot(container, 'chart-header-handle')).toBeNull()
	})
})
