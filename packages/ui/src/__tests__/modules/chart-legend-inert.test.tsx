import { describe, expect, it, vi } from 'vitest'
import { BarChart, DonutChart, ScatterChart } from '../../modules/chart'
import { resolveLegend } from '../../modules/chart/engine/chart-legend/schema'
import { allBySlot, bySlot, fireEvent, renderUI } from '../helpers'

const DATA = [
	{ quarter: 'Q1', revenue: 40, costs: 24 },
	{ quarter: 'Q2', revenue: 80, costs: 31 },
]

const SERIES = [
	{ xKey: 'quarter', yKey: 'revenue', yName: 'Revenue' },
	{ xKey: 'quarter', yKey: 'costs', yName: 'Costs' },
] as const

function chart(legend?: Parameters<typeof BarChart<(typeof DATA)[number]>>[0]['legend']) {
	return (
		<BarChart
			aria-label="Revenue by quarter"
			data={DATA}
			series={[...SERIES]}
			legend={legend}
			width={600}
		/>
	)
}

describe('resolveLegend', () => {
	it('passes a boolean or placement string through with inert off', () => {
		expect(resolveLegend(undefined)).toEqual({
			value: undefined,
			placement: undefined,
			inert: false,
		})

		// A bare boolean carries the show value but no placement.
		expect(resolveLegend(true)).toEqual({ value: true, placement: undefined, inert: false })

		expect(resolveLegend(false)).toEqual({ value: false, placement: undefined, inert: false })

		expect(resolveLegend('left')).toEqual({ value: 'left', placement: 'left', inert: false })
	})

	it('reads the object form as its placement plus the inert flag', () => {
		expect(resolveLegend({ placement: 'left', inert: true })).toEqual({
			value: 'left',
			placement: 'left',
			inert: true,
		})

		// No placement falls to the default show rule (value undefined), inert defaulting off.
		expect(resolveLegend({ inert: true })).toEqual({
			value: undefined,
			placement: undefined,
			inert: true,
		})

		expect(resolveLegend({})).toEqual({ value: undefined, placement: undefined, inert: false })
	})
})

describe('chart legend inert prop', () => {
	it('renders the legend as an inert key when the object form sets inert', () => {
		const { container } = renderUI(chart({ inert: true }))

		const legend = bySlot(container, 'chart-legend')

		expect(legend).not.toBeNull()

		// The whole legend subtree is out of the tab order and off the pointer.
		expect(legend?.hasAttribute('inert')).toBe(true)

		// No toolbar role — an inert legend holds no focusable control.
		expect(legend?.getAttribute('role')).toBeNull()
	})

	it('keeps the legend interactive for a bare placement string', () => {
		const { container } = renderUI(chart('bottom'))

		const legend = bySlot(container, 'chart-legend')

		expect(legend?.hasAttribute('inert')).toBe(false)

		expect(legend?.getAttribute('role')).toBe('toolbar')

		// Its entries are live switches.
		expect(allBySlot(container, 'chart-legend-item').length).toBeGreaterThan(0)
	})

	it('places an inert legend exactly as its bare placement would', () => {
		// A side placement lays the rail out as a panel; inert only sheds the controls.
		const { container } = renderUI(chart({ placement: 'left', inert: true }))

		const legend = bySlot(container, 'chart-legend')

		expect(legend?.hasAttribute('inert')).toBe(true)

		expect(legend?.className).toContain('flex-col')
	})
})

describe('chart legend onHiddenChange', () => {
	const firstEntry = (container: HTMLElement) =>
		allBySlot(container, 'chart-legend-item')[0] as HTMLButtonElement

	it('reports the set a legend switch turns off, and the set it restores', () => {
		const onHiddenChange = vi.fn()

		const { container } = renderUI(chart({ onHiddenChange }))

		// Every series shows on mount; the empty set is the rest state.
		expect(onHiddenChange).not.toHaveBeenCalled()

		fireEvent.click(firstEntry(container))

		expect(onHiddenChange).toHaveBeenCalledExactlyOnceWith(new Set([0]))

		fireEvent.click(firstEntry(container))

		expect(onHiddenChange).toHaveBeenLastCalledWith(new Set())

		expect(onHiddenChange).toHaveBeenCalledTimes(2)
	})

	it('carries every index switched off, not only the last', () => {
		const onHiddenChange = vi.fn()

		const { container } = renderUI(chart({ onHiddenChange }))

		const items = allBySlot(container, 'chart-legend-item')

		fireEvent.click(items[0] as HTMLButtonElement)

		fireEvent.click(items[1] as HTMLButtonElement)

		expect(onHiddenChange).toHaveBeenLastCalledWith(new Set([0, 1]))
	})

	// An inert legend needs no gate of its own: the subtree carries the native
	// `inert` attribute, which takes its switches off the pointer and out of the
	// tab order. That is pinned above, and jsdom does not enforce `inert`, so a
	// click here would assert the environment rather than the product.

	// The three engines behind the eight chart types each own their own toggle
	// call, so each needs its own proof that the report is wired.
	it('reports from the sector engine', () => {
		const onHiddenChange = vi.fn()

		const { container } = renderUI(
			<DonutChart
				aria-label="Share"
				data={DATA}
				series={[{ xKey: 'quarter', yKey: 'revenue' }]}
				legend={{ onHiddenChange }}
				width={600}
			/>,
		)

		fireEvent.click(firstEntry(container))

		expect(onHiddenChange).toHaveBeenCalledExactlyOnceWith(new Set([0]))
	})

	it('reports from the scatter engine', () => {
		const onHiddenChange = vi.fn()

		const { container } = renderUI(
			<ScatterChart
				aria-label="Costs against revenue"
				data={DATA}
				series={[
					{ xKey: 'revenue', yKey: 'costs', yName: 'Costs' },
					{ xKey: 'revenue', yKey: 'revenue', yName: 'Revenue' },
				]}
				legend={{ onHiddenChange }}
				width={600}
			/>,
		)

		fireEvent.click(firstEntry(container))

		expect(onHiddenChange).toHaveBeenCalledExactlyOnceWith(new Set([0]))
	})
})
