import { describe, expect } from 'vitest'
import { ContextMenu } from '../../components/context-menu'
import { TOUCH_CONTEXT_MENU_DELAY } from '../../components/menu/use-menu-touch-hold'
import { TOUCH_TAP_WINDOW } from '../../hooks/use-touch-tap'
import { BarChart, ChoroplethChart, DonutChart } from '../../modules/chart'
import { MapPlat } from '../../modules/map'
import { bySlot, fireEvent, renderUI, screen } from '../helpers'
import { type FakeClock, it, onFakeClock } from '../helpers/fake-clock'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'

/**
 * A touch hold on a chart opens its context menu, and no readout.
 *
 * iOS Safari fires no `contextmenu` event on a long press, so the menu times the hold itself
 * (`useMenuTouchHold`). A touch reads nothing from the chart, so the hold opens no tooltip. A
 * finger that moves before the hold fires is a scroll, and opens nothing.
 */
describe('a touch hold on a chart', () => {
	onFakeClock()

	const data = [
		{ quarter: 'Q1', revenue: 40 },
		{ quarter: 'Q2', revenue: 80 },
	]

	const touch = { pointerType: 'touch', isPrimary: true, pointerId: 1, clientX: 280, clientY: 100 }

	function renderBar(props: { contextMenu?: false } = {}) {
		return renderUI(
			<BarChart
				aria-label="Revenue by quarter"
				width={400}
				data={data}
				series={[{ xKey: 'quarter', yKey: 'revenue', yName: 'Revenue' }]}
				{...props}
			/>,
		)
	}

	it('opens the context menu', async ({ clock }) => {
		const { container } = renderBar()

		const hit = bySlot(container, 'chart-hit') as Element

		fireEvent.pointerDown(hit, touch)

		await clock.advance(TOUCH_CONTEXT_MENU_DELAY - 1)

		expect(screen.queryByRole('menu')).toBeNull()

		await clock.advance(1)

		expect(screen.getByRole('menu', { name: 'Revenue by quarter menu' })).toBeInTheDocument()

		expect(screen.getByRole('menuitem', { name: 'View data' })).toBeInTheDocument()
	})

	it('opens nothing when the finger moves first, as a scroll does', async ({ clock }) => {
		const { container } = renderBar()

		const hit = bySlot(container, 'chart-hit') as Element

		fireEvent.pointerDown(hit, touch)

		fireEvent.pointerMove(hit, { ...touch, clientY: touch.clientY + 40 })

		await clock.advance(TOUCH_CONTEXT_MENU_DELAY * 2)

		expect(screen.queryByRole('menu')).toBeNull()
	})

	it('opens nothing on a chart with the menu off', async ({ clock }) => {
		const { container } = renderBar({ contextMenu: false })

		fireEvent.pointerDown(bySlot(container, 'chart-hit') as Element, touch)

		await clock.advance(TOUCH_CONTEXT_MENU_DELAY * 2)

		expect(screen.queryByRole('menu')).toBeNull()
	})

	it('opens the menu of a choropleth, and no menu on a plain map', async ({ clock }) => {
		const { container } = renderUI(
			<>
				<ChoroplethChart
					title="Population"
					aria-label="Population"
					geography={FIXTURE_GEOJSON}
					data={[{ region: 'A', pop: 10 }]}
					series={[{ idKey: 'region', colorKey: 'pop', colorRange: ['#fff', '#000'] }]}
					width={400}
				/>
				<ContextMenu items={[{ key: 'page', label: 'Page item', onAction: () => {} }]}>
					<div data-slot="page">
						<MapPlat aria-label="Plain" geography={FIXTURE_GEOJSON} width={400} />
					</div>
				</ContextMenu>
			</>,
		)

		const [choropleth, plain] = container.querySelectorAll('[data-slot="map-plot"]')

		fireEvent.pointerDown(plain as Element, touch)

		await clock.advance(TOUCH_CONTEXT_MENU_DELAY * 2)

		expect(screen.queryByRole('menu')).toBeNull()

		fireEvent.pointerUp(plain as Element, touch)

		fireEvent.pointerDown(choropleth as Element, touch)

		await clock.advance(TOUCH_CONTEXT_MENU_DELAY)

		expect(screen.getByRole('menu', { name: 'Population menu' })).toBeInTheDocument()
	})

	/** Holds a touch still on the element past the tap window, then lifts it. */
	async function hold(target: Element, clock: FakeClock) {
		fireEvent.pointerOver(target, touch)

		fireEvent.pointerDown(target, touch)

		await clock.advance(TOUCH_TAP_WINDOW * 2)

		expect(screen.queryByRole('tooltip')).toBeNull()

		fireEvent.pointerUp(target, touch)
	}

	it('opens no tooltip on a cartesian chart', async ({ clock }) => {
		const { container } = renderUI(
			<BarChart
				aria-label="Revenue by quarter"
				width={400}
				data={data}
				series={[{ xKey: 'quarter', yKey: 'revenue', yName: 'Revenue' }]}
			/>,
		)

		await hold(bySlot(container, 'chart-hit') as Element, clock)

		expect(bySlot(container, 'tooltip-content')).toBeNull()

		expect(bySlot(container, 'chart-bar-spot')).toBeNull()
	})

	it('opens no tooltip on a donut', async ({ clock }) => {
		const { container } = renderUI(
			<DonutChart
				aria-label="Revenue by quarter"
				width={300}
				height={200}
				data={data}
				series={[{ xKey: 'quarter', yKey: 'revenue' }]}
			/>,
		)

		await hold(bySlot(container, 'chart-slice') as Element, clock)

		expect(bySlot(container, 'tooltip-content')).toBeNull()

		expect(container.querySelector('.opacity-25')).toBeNull()
	})
})
