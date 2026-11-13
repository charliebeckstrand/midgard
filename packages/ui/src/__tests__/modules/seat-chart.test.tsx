import { describe, expect, it } from 'vitest'
import { MARK_GAP } from '../../modules/chart/engine/chart-constants'
import { seatExtent, seatFit, seatLayout } from '../../modules/chart/engine/chart-geometry/seat'
import { SeatChart, type SeatChartProps } from '../../modules/chart/seat-chart'
import { allBySlot, bySlot, fireEvent, getSlot, present, renderUI } from '../helpers'

const GROUPS: SeatChartProps['groups'] = [
	{ seats: 47, color: 'blue', label: 'Democrats' },
	{ seats: 6, color: 'zinc', label: 'Not called', hollow: true },
	{ seats: 47, color: 'red', label: 'Republicans' },
]

function chart(extra?: Partial<SeatChartProps>) {
	return (
		<SeatChart
			aria-label="Senate seats"
			groups={GROUPS}
			majority={51}
			width={400}
			height={200}
			legend={false}
			{...extra}
		/>
	)
}

/** Whether each group of seats recedes behind an emphasis. */
function receded(container: HTMLElement): boolean[] {
	return allBySlot(container, 'chart-seat-group').map(
		(path) => path.parentElement?.getAttribute('class')?.includes('opacity-25') ?? false,
	)
}

/** The number of discs in a seat path, or of dashes in the majority line: each opens with one move. */
function discs(path: Element): number {
	return (path.getAttribute('d')?.match(/M/g) ?? []).length
}

describe('SeatChart', () => {
	it('draws one path per group, with a disc for each seat', () => {
		const { container } = renderUI(chart())

		const paths = allBySlot(container, 'chart-seat-group')

		expect(paths.map(discs)).toEqual([47, 6, 47])
	})

	it('strokes a hollow group as rings and fills the rest', () => {
		const { container } = renderUI(chart())

		const [democrats, open] = allBySlot(container, 'chart-seat-group')

		expect(open).toHaveAttribute('fill', 'none')

		expect(open?.getAttribute('class')).toContain('stroke-zinc')

		expect(democrats).not.toHaveAttribute('fill')

		expect(democrats?.getAttribute('class')).toContain('fill-blue')
	})

	it('draws the majority line only with a majority inside the chamber', () => {
		expect(bySlot(renderUI(chart()).container, 'chart-majority')).not.toBeNull()

		expect(bySlot(renderUI(chart({ majority: undefined })).container, 'chart-majority')).toBeNull()

		expect(bySlot(renderUI(chart({ majority: 101 })).container, 'chart-majority')).toBeNull()
	})

	it('draws the majority line as dashes under a marker', () => {
		const { container } = renderUI(chart())

		expect(discs(getSlot(container, 'chart-majority'))).toBeGreaterThan(1)

		expect(
			getSlot(container, 'chart-majority-marker').getAttribute('points')?.split(' '),
		).toHaveLength(3)
	})

	it('labels the majority above its marker only with majorityLabel', () => {
		expect(bySlot(renderUI(chart()).container, 'chart-majority-label')).toBeNull()

		const label = bySlot(renderUI(chart({ majorityLabel: true })).container, 'chart-majority-label')

		expect(label?.textContent).toBe('51 to win')

		expect(label?.getAttribute('text-anchor')).toBe('middle')

		expect(
			bySlot(
				renderUI(chart({ majorityLabel: true, majority: undefined })).container,
				'chart-majority-label',
			),
		).toBeNull()
	})

	it('drops the majority label where it has no space, and keeps the line', () => {
		const { container } = renderUI(chart({ majorityLabel: true, width: 60, height: 30 }))

		expect(bySlot(container, 'chart-majority-label')).toBeNull()

		expect(bySlot(container, 'chart-majority')).not.toBeNull()
	})

	it('names each group in a key with no switches', () => {
		const { container } = renderUI(chart({ legend: true }))

		expect(allBySlot(container, 'chart-legend-item').map((item) => item.textContent)).toEqual([
			'Democrats',
			'Not called',
			'Republicans',
		])

		// An inert legend keeps its entries out of the tab order and the tree of controls.
		expect(bySlot(container, 'chart-legend')).toHaveAttribute('inert')
	})

	it('keys a hollow group with a frame and the rest with a fill', () => {
		const { container } = renderUI(chart({ legend: true }))

		const keys = allBySlot(container, 'chart-legend-item').map(
			(item) => item.querySelector('[data-slot="swatch"]')?.getAttribute('data-variant') ?? null,
		)

		expect(keys).toEqual(['solid', 'outline', 'solid'])
	})

	it('lists the seats of each group in the data table', () => {
		const { container } = renderUI(chart())

		const table = present(bySlot(container, 'chart-table'), 'the data table')

		expect(table.textContent).toContain('Seats')

		expect(table.textContent).toContain('Not called')

		expect(table.textContent).toContain('47')
	})

	it('renders its children in the hole', () => {
		const { container } = renderUI(chart({ children: <span>51 to win</span> }))

		expect(bySlot(container, 'chart-center')?.textContent).toBe('51 to win')
	})

	it('lights the group under the pointer and recedes the rest', () => {
		const { container } = renderUI(chart())

		const hit = getSlot(container, 'chart-hit')

		hit.getBoundingClientRect = () =>
			({ left: 0, top: 0, right: 400, bottom: 200, width: 400, height: 200, x: 0, y: 0 }) as DOMRect

		const layout = seatLayout(100, 5, 51)

		const fit = seatFit(400, 200, MARK_GAP, seatExtent(layout))

		// The last seat sits at the end of the hemicycle, in the last group.
		const seat = layout.seats.at(-1)

		if (!seat) throw new Error('expected the last seat')

		fireEvent.pointerMove(hit, {
			clientX: fit.cx + seat.x * fit.scale,
			clientY: fit.cy + seat.y * fit.scale,
		})

		expect(receded(container)).toEqual([true, true, false])

		fireEvent.pointerLeave(hit)

		expect(receded(container)).toEqual([false, false, false])
	})

	it('reads the seats of the pointed group at full strength', () => {
		const { container } = renderUI(chart())

		const hit = getSlot(container, 'chart-hit')

		hit.getBoundingClientRect = () =>
			({ left: 0, top: 0, right: 400, bottom: 200, width: 400, height: 200, x: 0, y: 0 }) as DOMRect

		const layout = seatLayout(100, 5, 51)

		const fit = seatFit(400, 200, MARK_GAP, seatExtent(layout))

		const seat = layout.seats.at(-1)

		if (!seat) throw new Error('expected the last seat')

		fireEvent.pointerMove(hit, {
			clientX: fit.cx + seat.x * fit.scale,
			clientY: fit.cy + seat.y * fit.scale,
		})

		const row = present(document.querySelector('[data-slot="chart-tooltip-row"]'), 'the row')

		expect(row.textContent).toContain('47')

		expect(row.getAttribute('class')).not.toContain('opacity-25')
	})

	it('draws an empty chamber with no seats and no hit layer', () => {
		const { container } = renderUI(chart({ groups: [], majority: undefined }))

		expect(allBySlot(container, 'chart-seat-group')).toHaveLength(0)

		expect(bySlot(container, 'chart-hit')).toBeNull()
	})
})
