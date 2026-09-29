import type { CSSProperties, ReactNode } from 'react'
import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { HeatmapChart, LineChart, PieChart } from '../../../modules/chart'
import { bySlot, fireEvent, getSlot, present, renderUI, waitFor } from '../../helpers'
import { pause } from '../helpers/wall-clock'

/**
 * A chart readout inside a scaled or zoomed ancestor, against the real floating
 * engine. The chart reads the pointer in the units that it draws in, so the
 * readout must map its anchor back out by the same scale to sit on the pointer.
 * The mocked `browser` instance does not position the panel, so this check is
 * only valid here.
 */

/** The frames that the readout must hold its anchor under. */
const FRAMES: Record<string, CSSProperties> = {
	none: {},
	'scale(2)': { transform: 'scale(2)', transformOrigin: '0 0' },
	'scale(0.5)': { transform: 'scale(0.5)', transformOrigin: '0 0' },
	'zoom: 2': { zoom: 2 },
}

/** The gap that the chart readout keeps above its anchor. */
const GAP = 12

/** The largest distance in px between the anchor and where the panel puts it. */
const TOLERANCE = 2

/** A wrapper with the frame, with room above and to the left for the panel. */
function Frame({ frame, children }: { frame: CSSProperties; children: ReactNode }) {
	return <div style={{ ...frame, width: 400, marginTop: 200, marginLeft: 200 }}>{children}</div>
}

/** The screen center of an element. */
function centerOf(element: Element) {
	const box = element.getBoundingClientRect()

	return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
}

/** Points at `at` on `target`, and returns the panel after floating-ui places it. */
async function pointAt(target: Element, at: { x: number; y: number }) {
	fireEvent.pointerEnter(target, { clientX: at.x, clientY: at.y })

	fireEvent.pointerMove(target, { clientX: at.x, clientY: at.y })

	const panel = await waitFor(() => present(bySlot(document.body, 'tooltip-content'), 'tooltip'))

	await pause(50)

	return panel.getBoundingClientRect()
}

/** Asserts that the panel sits centered above `at`, the gap clear of it. */
function expectAbove(panel: DOMRect, at: { x: number; y: number }) {
	expect(Math.abs(panel.left + panel.width / 2 - at.x)).toBeLessThan(TOLERANCE)

	expect(Math.abs(panel.bottom - (at.y - GAP))).toBeLessThan(TOLERANCE)
}

describe('chart readout under a scaled ancestor (real browser)', () => {
	beforeAll(() => page.viewport(1400, 1200))

	it.each(Object.entries(FRAMES))('anchors the snapped line readout under %s', async (_, frame) => {
		const { container } = renderUI(
			<Frame frame={frame}>
				<LineChart
					aria-label="Revenue"
					width={400}
					points
					animate={false}
					crosshair={{ snap: true }}
					data={[
						{ m: 'Jan', v: 40 },
						{ m: 'Feb', v: 90 },
						{ m: 'Mar', v: 65 },
						{ m: 'Apr', v: 70 },
					]}
					series={[{ xKey: 'm', yKey: 'v', yName: 'Revenue' }]}
				/>
			</Frame>,
		)

		const dot = await waitFor(() =>
			present(container.querySelectorAll('[data-slot="chart-point"]')[2], 'the third point'),
		)

		// The readout snaps to the point, so it sits on the point on screen.
		const at = centerOf(dot)

		expectAbove(await pointAt(getSlot(container, 'chart-hit'), at), at)
	})

	it.each(Object.entries(FRAMES))('anchors the heatmap readout under %s', async (_, frame) => {
		const { container } = renderUI(
			<Frame frame={frame}>
				<HeatmapChart
					aria-label="Commits"
					width={400}
					data={[
						{ day: 'Mon', hour: '9', n: 1 },
						{ day: 'Mon', hour: '10', n: 9 },
						{ day: 'Tue', hour: '9', n: 4 },
						{ day: 'Tue', hour: '10', n: 6 },
					]}
					series={[{ xKey: 'hour', yKey: 'day', colorKey: 'n', colorRange: ['#fff', '#000'] }]}
				/>
			</Frame>,
		)

		const hit = getSlot(container, 'chart-hit')

		const box = hit.getBoundingClientRect()

		const at = { x: box.left + (box.width * 3) / 4, y: box.top + (box.height * 3) / 4 }

		expectAbove(await pointAt(hit, at), at)
	})

	it.each(Object.entries(FRAMES))('anchors the pie readout under %s', async (_, frame) => {
		const { container } = renderUI(
			<Frame frame={frame}>
				<PieChart
					aria-label="Share"
					width={300}
					animate={false}
					data={[
						{ name: 'A', value: 3 },
						{ name: 'B', value: 5 },
					]}
					series={[{ xKey: 'name', yKey: 'value' }]}
				/>
			</Frame>,
		)

		const slices = await waitFor(() => {
			const found = container.querySelectorAll('[data-slot="chart-slice-hit"]')

			expect(found.length).toBe(2)

			return found
		})

		const slice = present(slices[1], 'the second slice')

		const at = centerOf(slice)

		expectAbove(await pointAt(slice, at), at)
	})
})
