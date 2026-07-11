import { describe, expect, it } from 'vitest'
import { BarChart } from '../../modules/chart'
import { resolveLegend } from '../../modules/chart/chart-schema'
import { allBySlot, bySlot, renderUI } from '../helpers'

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
