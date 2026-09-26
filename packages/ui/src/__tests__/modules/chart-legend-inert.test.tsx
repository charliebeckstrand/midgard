import type { ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BarChart, DonutChart, LineChart, ScatterChart } from '../../modules/chart'
import { resolveLegend } from '../../modules/chart/engine/chart-legend/schema'
import { act, allBySlot, bySlot, fireEvent, renderUI } from '../helpers'

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

/** The same chart with top-level props layered on; the legend keeps its default form. */
function chartWith(extra: Partial<Parameters<typeof BarChart<(typeof DATA)[number]>>[0]>) {
	return (
		<BarChart
			aria-label="Revenue by quarter"
			data={DATA}
			series={[...SERIES]}
			width={600}
			{...extra}
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

		const { container } = renderUI(chartWith({ onHiddenChange }))

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

		const { container } = renderUI(chartWith({ onHiddenChange }))

		const items = allBySlot(container, 'chart-legend-item')

		fireEvent.click(items[0] as HTMLButtonElement)

		fireEvent.click(items[1] as HTMLButtonElement)

		expect(onHiddenChange).toHaveBeenLastCalledWith(new Set([0, 1]))
	})

	// The three engines behind the eight chart types each own their own toggle
	// call, so each needs its own proof that the report is wired. The cartesian
	// engine is covered by the cases above, which render a BarChart.
	it.each<[string, (onHiddenChange: () => void) => ReactElement]>([
		[
			'sector',
			(onHiddenChange) => (
				<DonutChart
					aria-label="Share"
					data={DATA}
					series={[{ xKey: 'quarter', yKey: 'revenue' }]}
					onHiddenChange={onHiddenChange}
					width={600}
				/>
			),
		],
		[
			'scatter',
			(onHiddenChange) => (
				<ScatterChart
					aria-label="Costs against revenue"
					data={DATA}
					series={[
						{ xKey: 'revenue', yKey: 'costs', yName: 'Costs' },
						{ xKey: 'revenue', yKey: 'revenue', yName: 'Revenue' },
					]}
					onHiddenChange={onHiddenChange}
					width={600}
				/>
			),
		],
	])('reports from the %s engine', (_name, render) => {
		const onHiddenChange = vi.fn()

		const { container } = renderUI(render(onHiddenChange))

		fireEvent.click(firstEntry(container))

		expect(onHiddenChange).toHaveBeenCalledExactlyOnceWith(new Set([0]))
	})

	// A legend={true} chart keeps its legend AND reports, which is why the prop
	// sits beside `legend` rather than inside its object form: the object form
	// cannot spell `true`, so a single-series chart moved into it loses the legend
	// the flag forced on.
	it('reports from a legend forced on by the boolean form', () => {
		const onHiddenChange = vi.fn()

		const { container } = renderUI(
			<BarChart
				aria-label="Revenue by quarter"
				data={DATA}
				series={[{ xKey: 'quarter', yKey: 'revenue', yName: 'Revenue' }]}
				legend
				onHiddenChange={onHiddenChange}
				width={600}
			/>,
		)

		expect(allBySlot(container, 'chart-legend-item')).toHaveLength(1)

		fireEvent.click(firstEntry(container))

		expect(onHiddenChange).toHaveBeenCalledExactlyOnceWith(new Set([0]))
	})
})

describe('chart legend fit after a label change', () => {
	// A small flex-wrap layout for the ghost row of the legend. Each ghost control
	// is `24 + 7 * label length` px wide. The row packs them left into 280px, 30px
	// for each line. Nothing else gets a layout.
	//
	// The ResizeObserver stub of the suite stays inert. A browser agrees here: the
	// ghost keeps the same box, two lines before and after, so no observer fires.
	const GHOST_WIDTH = 280

	const LINE = 30

	const ghostOf = (node: Element) => node.closest<HTMLElement>('[inert][aria-hidden="true"]')

	const widthOf = (control: HTMLElement) => 24 + 7 * (control.textContent ?? '').length

	/** Packs the buttons of a ghost into lines, and gives the offset of each. */
	function pack(ghost: HTMLElement) {
		const placed = new Map<Element, { left: number; top: number }>()

		let left = 0

		let top = 0

		for (const control of ghost.querySelectorAll<HTMLElement>('button')) {
			const width = widthOf(control)

			if (left > 0 && left + width > GHOST_WIDTH) {
				left = 0

				top += LINE
			}

			placed.set(control, { left, top })

			left += width
		}

		return placed
	}

	/** The ghost that holds a button, or null for any other element. */
	const ghostButton = (node: HTMLElement) => (node.tagName === 'BUTTON' ? ghostOf(node) : null)

	const saved: [object, string, PropertyDescriptor | undefined][] = []

	function define(target: object, key: string, get: (this: HTMLElement) => number) {
		saved.push([target, key, Object.getOwnPropertyDescriptor(target, key)])

		Object.defineProperty(target, key, { configurable: true, get })
	}

	beforeEach(() => {
		define(HTMLElement.prototype, 'offsetWidth', function () {
			return ghostButton(this) ? widthOf(this) : 0
		})

		define(HTMLElement.prototype, 'offsetHeight', function () {
			return ghostButton(this) ? LINE : 0
		})

		define(HTMLElement.prototype, 'offsetLeft', function () {
			const ghost = ghostButton(this)

			return ghost ? (pack(ghost).get(this)?.left ?? 0) : 0
		})

		define(HTMLElement.prototype, 'offsetTop', function () {
			const ghost = ghostButton(this)

			return ghost ? (pack(ghost).get(this)?.top ?? 0) : 0
		})

		define(Element.prototype, 'clientWidth', function () {
			return this.matches('[inert][aria-hidden="true"]') ? GHOST_WIDTH : 0
		})
	})

	afterEach(() => {
		for (const [target, key, descriptor] of saved.reverse()) {
			if (descriptor) Object.defineProperty(target, key, descriptor)
			else delete (target as Record<string, unknown>)[key]
		}

		saved.length = 0
	})

	const LONG = 'D'.repeat(32)

	function lines(names: [string, string, string, string]) {
		return (
			<LineChart
				aria-label="Four series"
				width={300}
				legend
				data={[{ m: 'Jan', a: 1, b: 2, c: 3, d: 4 }]}
				series={[
					{ xKey: 'm', yKey: 'a', yName: names[0] },
					{ xKey: 'm', yKey: 'b', yName: names[1] },
					{ xKey: 'm', yKey: 'c', yName: names[2] },
					{ xKey: 'm', yKey: 'd', yName: names[3] },
				]}
			/>
		)
	}

	// The line legend lists its switches last series first, so the ghost reads
	// the names in reverse. The first set packs as "LONG | Cc Bb Aa", and the
	// second set as "Dd Cc Bb | LONG". Both fill two lines of the same box.
	it('cuts the capped row again when the labels change but the count does not', async () => {
		// A fresh mount of the final labels gives the expected count.
		const fresh = renderUI(lines([LONG, 'Bb', 'Cc', 'Dd']))

		await act(async () => {})

		const expected = allBySlot(fresh.container, 'chart-legend-item').length

		fresh.unmount()

		// The same final labels, after a rerender from a first set.
		const { container, rerender } = renderUI(lines(['Aa', 'Bb', 'Cc', LONG]))

		await act(async () => {})

		rerender(lines([LONG, 'Bb', 'Cc', 'Dd']))

		await act(async () => {})

		expect(allBySlot(container, 'chart-legend-item')).toHaveLength(expected)
	})
})
