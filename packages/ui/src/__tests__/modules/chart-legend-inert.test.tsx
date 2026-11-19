import type { ReactElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BarChart, DonutChart, LineChart, ScatterChart } from '../../modules/chart'
import { findReseatTarget } from '../../modules/chart/engine/chart-legend/legend'
import { resolveLegend } from '../../modules/chart/engine/chart-legend/schema'
import { act, allBySlot, bySlot, fireEvent, present, renderUI } from '../helpers'

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
	it('passes a boolean or placement string through with inert and references off', () => {
		expect(resolveLegend(undefined)).toEqual({
			value: undefined,
			placement: undefined,
			inert: false,
			references: false,
			referenceVariant: 'chips',
			referenceValue: true,
		})

		// A bare boolean carries the show value but no placement.
		expect(resolveLegend(true)).toEqual({
			value: true,
			placement: undefined,
			inert: false,
			references: false,
			referenceVariant: 'chips',
			referenceValue: true,
		})

		expect(resolveLegend(false)).toEqual({
			value: false,
			placement: undefined,
			inert: false,
			references: false,
			referenceVariant: 'chips',
			referenceValue: true,
		})

		expect(resolveLegend('left')).toEqual({
			value: 'left',
			placement: 'left',
			inert: false,
			references: false,
			referenceVariant: 'chips',
			referenceValue: true,
		})
	})

	it('reads the object form as its placement plus the inert flag', () => {
		expect(resolveLegend({ placement: 'left', inert: true, references: false })).toEqual({
			value: 'left',
			placement: 'left',
			inert: true,
			references: false,
			referenceVariant: 'chips',
			referenceValue: true,
		})

		// No placement falls to the default show rule (value undefined), inert defaulting off.
		expect(resolveLegend({ inert: true, references: false })).toEqual({
			value: undefined,
			placement: undefined,
			inert: true,
			references: false,
			referenceVariant: 'chips',
			referenceValue: true,
		})

		expect(resolveLegend({})).toEqual({
			value: undefined,
			placement: undefined,
			inert: false,
			references: false,
			referenceVariant: 'chips',
			referenceValue: true,
		})
	})

	it('reads the references flag of the object form', () => {
		expect(resolveLegend({ references: true })).toEqual({
			value: undefined,
			placement: undefined,
			inert: false,
			references: true,
			referenceVariant: 'chips',
			referenceValue: true,
		})
	})

	it('reads the variant and the value of an object `references`', () => {
		expect(resolveLegend({ references: { variant: 'notes', value: false } })).toEqual({
			value: undefined,
			placement: undefined,
			inert: false,
			references: true,
			referenceVariant: 'notes',
			referenceValue: false,
		})
	})
})

describe('chart legend inert prop', () => {
	it('renders the legend as an inert key when the object form sets inert', () => {
		const { container } = renderUI(chart({ inert: true }))

		const legend = bySlot(container, 'chart-legend')

		expect(legend).not.toBeNull()

		// The whole legend subtree is out of the tab order and off the pointer.
		expect(legend?.hasAttribute('inert')).toBe(true)

		// No toolbar role: an inert legend holds no focusable control.
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

	const findGhost = (node: Element) => node.closest<HTMLElement>('[inert][aria-hidden="true"]')

	const getWidth = (control: HTMLElement) => 24 + 7 * (control.textContent ?? '').length

	/** Packs the buttons of a ghost into lines, and gives the offset of each. */
	function pack(ghost: HTMLElement) {
		const placed = new Map<Element, { left: number; top: number }>()

		let left = 0

		let top = 0

		for (const control of ghost.querySelectorAll<HTMLElement>('button')) {
			const width = getWidth(control)

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
	const ghostButton = (node: HTMLElement) => (node.tagName === 'BUTTON' ? findGhost(node) : null)

	function define<K extends 'offsetWidth' | 'offsetHeight' | 'offsetLeft' | 'offsetTop'>(
		key: K,
		get: (this: HTMLElement) => number,
	) {
		vi.spyOn(HTMLElement.prototype, key, 'get').mockImplementation(get)
	}

	beforeEach(() => {
		define('offsetWidth', function () {
			return ghostButton(this) ? getWidth(this) : 0
		})

		define('offsetHeight', function () {
			return ghostButton(this) ? LINE : 0
		})

		define('offsetLeft', function () {
			const ghost = ghostButton(this)

			return ghost ? (pack(ghost).get(this)?.left ?? 0) : 0
		})

		define('offsetTop', function () {
			const ghost = ghostButton(this)

			return ghost ? (pack(ghost).get(this)?.top ?? 0) : 0
		})

		vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(function (this: Element) {
			return this.matches('[inert][aria-hidden="true"]') ? GHOST_WIDTH : 0
		})
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

	/** The `+N` chip of the legend. */
	const more = (container: HTMLElement) =>
		container.querySelector<HTMLElement>('[data-slot="chart-legend-more"]')

	/** Whether any part of the drawing has receded behind an emphasis. */
	const recedes = (container: HTMLElement) =>
		container.querySelector('svg [class*="opacity-25"]') !== null

	it('clears the emphasis of a pointed switch when the overflow popover closes', async () => {
		const { container } = renderUI(lines(['Aa', 'Bb', 'Cc', LONG]))

		await act(async () => {})

		const chip = present(more(container), 'the +N chip')

		await act(async () => {
			fireEvent.click(chip)
		})

		const switched = present(
			document.querySelector<HTMLElement>(
				'[data-slot="chart-legend-overflow"] [data-slot="chart-legend-item"]',
			),
			'a switch in the popover',
		)

		fireEvent.pointerEnter(switched, { pointerType: 'mouse' })

		expect(recedes(container)).toBe(true)

		await act(async () => {
			fireEvent.keyDown(switched, { key: 'Escape' })
		})

		expect(document.querySelector('[data-slot="chart-legend-overflow"]')).toBeNull()

		expect(recedes(container)).toBe(false)
	})

	// The legend orders the switches by the latest value, so `d` leads and `a`
	// comes last.
	it('moves the focus to the `+N` chip when a new cut folds the focused switch', async () => {
		const { container, rerender } = renderUI(lines(['Aa', 'Bb', 'Cc', 'Dd']))

		await act(async () => {})

		// Four short switches fit on one line, so the row has no chip.
		expect(more(container)).toBeNull()

		const last = present(allBySlot(container, 'chart-legend-item').at(-1), 'the last switch')

		act(() => last.focus())

		// A long first label folds the last switches into the `+N` chip. The
		// focused switch unmounts, so the focus moves to the chip that holds it.
		rerender(lines(['Aa', 'Bb', 'Cc', LONG]))

		await act(async () => {})

		expect(last.isConnected).toBe(false)

		expect(document.activeElement).toBe(more(container))
	})

	it('moves the focus to the last switch when a new cut removes the focused `+N` chip', async () => {
		const { container, rerender } = renderUI(lines(['Aa', 'Bb', 'Cc', LONG]))

		await act(async () => {})

		const chip = present(more(container), 'the +N chip')

		act(() => chip.focus())

		// Short labels fit on one line, so the row drops its chip, and the focus
		// moves to the last switch that stays.
		rerender(lines(['Aa', 'Bb', 'Cc', 'Dd']))

		await act(async () => {})

		expect(chip.isConnected).toBe(false)

		expect(document.activeElement).toBe(allBySlot(container, 'chart-legend-item').at(-1))
	})

	it('wraps the rules under the figure with no `+N` chip', async () => {
		const { container } = renderUI(
			<BarChart
				aria-label="Revenue by quarter"
				data={DATA}
				series={[{ xKey: 'quarter', yKey: 'revenue', yName: 'Revenue' }]}
				width={300}
				legend
				reference={['Target', 'Ceiling', 'Floor', LONG].map((label, index) => ({
					value: 40 + index * 10,
					label,
				}))}
			/>,
		)

		await act(async () => {})

		// The row of rules takes no cap, so every chip shows, even past the width
		// that caps the series row at one line.
		expect(allBySlot(container, 'chart-legend-reference')).toHaveLength(4)

		expect(
			bySlot(container, 'chart-legend-references')?.querySelector(
				'[data-slot="chart-legend-more"]',
			),
		).toBeNull()
	})
})

describe('findReseatTarget', () => {
	/** A row with a chip for each label, and a `+N` chip if asked. */
	function row(labels: string[], more = false) {
		const element = document.createElement('div')

		for (const label of labels) {
			const chip = document.createElement('button')

			chip.dataset.slot = 'chart-legend-reference'

			chip.textContent = label

			element.append(chip)
		}

		if (more) {
			const chip = document.createElement('button')

			chip.dataset.slot = 'chart-legend-more'

			element.append(chip)
		}

		return element
	}

	it('takes the `+N` chip of the row', () => {
		const element = row(['Aa', 'Bb'], true)

		expect(findReseatTarget(element)?.dataset.slot).toBe('chart-legend-more')
	})

	it('takes the last control of a row with no `+N` chip', () => {
		expect(findReseatTarget(row(['Aa', 'Bb']))?.textContent).toBe('Bb')
	})

	it('takes nothing from an empty row, or from a row that is not mounted', () => {
		expect(findReseatTarget(row([]))).toBeUndefined()

		expect(findReseatTarget(null)).toBeUndefined()
	})
})
