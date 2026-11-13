import type { ComponentProps } from 'react'
import { describe, expect, it } from 'vitest'
import { SeatChart } from '../../../modules/chart/seat-chart'
import { attach } from '../../helpers'
import { HALF_PIXEL } from '../../helpers/geometry/tolerance'
import { hydrate, serverMarkup } from '../../helpers/hydrate'

/**
 * The server markup of a seat chart draws its seats before the width of the
 * frame is measured. The fit of a seat chart is one scale and one center, so an
 * SVG that scales its drawing to the box puts each seat where the measured
 * frame puts it. The box of the plot was empty until hydration, and then the
 * seats appeared. These tests hold each group of seats, and the majority tick,
 * at the same box before and after the hydration.
 */
const GROUPS = [
	{ seats: 214, color: 'blue', label: 'Democrats' },
	{ seats: 18, color: 'zinc', label: 'Not called', hollow: true },
	{ seats: 203, color: 'red', label: 'Republicans' },
] satisfies ComponentProps<typeof SeatChart>['groups']

const cases = [
	{ name: 'a narrow box with a majority tick', width: 320, props: { majority: 218 } },
	{ name: 'a wide box with no tick', width: 640, props: {} },
	{
		name: 'a fixed height that limits the scale',
		width: 600,
		props: { majority: 218, height: 160 },
	},
] as const

function boxes(container: Element) {
	return [
		...container.querySelectorAll('[data-slot="chart-seat-group"], [data-slot="chart-majority"]'),
	].map((node) => {
		const rect = node.getBoundingClientRect()

		return {
			slot: node.getAttribute('data-slot'),
			box: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
		}
	})
}

describe('seat chart before measure (real browser)', () => {
	it.each(cases)(
		'draws the seats where the measured frame draws them: $name',
		({ width, props }) => {
			const chart = (
				<div style={{ width }}>
					<SeatChart aria-label="House seats" groups={GROUPS} {...props} />
				</div>
			)

			const container = attach(serverMarkup(chart))

			const before = boxes(container)

			expect(before.length).toBe('majority' in props ? GROUPS.length + 1 : GROUPS.length)

			const { onRecoverableError } = hydrate(container, chart)

			expect(onRecoverableError).not.toHaveBeenCalled()

			// The measured SVG has replaced the drawing of the server markup.
			expect(container.querySelector('svg[width]')).not.toBeNull()

			const after = boxes(container)

			expect(after.map((mark) => mark.slot)).toEqual(before.map((mark) => mark.slot))

			before.forEach((mark, at) => {
				expect(after[at]?.box).toMatchBox(mark.box, { tolerance: HALF_PIXEL })
			})
		},
	)

	// The label needs the width of its text, and the content of the hole needs
	// its own size. The seats show with them after the measure, not before.
	it.each([
		{ name: 'the majority label', props: { majority: 218, majorityLabel: true } },
		{ name: 'content in the hole', props: { children: <span>435</span> } },
	])('draws nothing before measure with $name', ({ props }) => {
		const container = serverMarkup(
			<div style={{ width: 320 }}>
				<SeatChart aria-label="House seats" groups={GROUPS} {...props} />
			</div>,
		)

		expect(container.querySelector('[data-slot="chart-seats"]')).toBeNull()
	})
})
