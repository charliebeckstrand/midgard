import { expect, vi } from 'vitest'
import { CALLOUT_LINE, type PieCallout } from '../../modules/chart/engine/chart-geometry/pie'

/**
 * Readers of the placed callouts of a pie, for the node suites of the chart
 * engine.
 *
 * Not re-exported from `helpers/index.ts`. The barrel loads user-event, which
 * needs a window, and the engine suites run with none. Each suite imports this
 * module by its path.
 */

/**
 * The label ys of one side, from the top down.
 *
 * @param anchor - The side: `start` for the right side, `end` for the left.
 * @returns The ys of the callouts on that side, in ascending order.
 */
export function sideYs(callouts: readonly PieCallout[], anchor: PieCallout['anchor']): number[] {
	return callouts
		.filter((callout) => callout.anchor === anchor)
		.map((callout) => callout.y)
		.sort((a, b) => a - b)
}

/**
 * The far edge of a callout label: its anchor x plus its width, outward from
 * the center on its side.
 *
 * @param extent - The drawn width of the label text.
 * @returns The x of the edge of the label that is far from the pie.
 */
export function farEdge(callout: PieCallout, extent: number): number {
	return callout.anchor === 'start' ? callout.x + extent : callout.x - extent
}

/**
 * The vertices of the leader of a callout.
 *
 * @returns The `[x, y]` of each point of the leader polyline, in order.
 */
export function leaderPoints(callout: PieCallout): [number, number][] {
	return callout.leader.split(' ').map((point) => point.split(',').map(Number) as [number, number])
}

/**
 * Asserts that each y of one side is at least `CALLOUT_LINE` below the y
 * above it, to within `slack`.
 *
 * @param ys - The ys of one side, in ascending order, as {@link sideYs} gives them.
 * @param slack - The amount by which a gap can be less than one line.
 */
export const expectLineApart = vi.defineHelper((ys: readonly number[], slack: number) => {
	for (let at = 1; at < ys.length; at++) {
		expect((ys[at] as number) - (ys[at - 1] as number)).toBeGreaterThanOrEqual(CALLOUT_LINE - slack)
	}
})
