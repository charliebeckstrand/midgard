// @vitest-environment node
import { fc, test } from '@fast-check/vitest'
import { describe, expect, it, vi } from 'vitest'
import {
	CALLOUT_LEADER,
	pieCallouts,
	pieSlices,
} from '../../modules/chart/engine/chart-geometry/pie'
import { FLOAT } from '../helpers/geometry/tolerance'
import { expectLineApart, sideYs } from '../helpers/pie-callouts'

// `pieCallouts` keeps each label inside the band `[top, bottom]` that it gets,
// and keeps the labels of one side at least `CALLOUT_LINE` apart. The chart
// gives a band that holds the leader circle, so the cases here do the same.

/** The callouts of a pie over `values`. */
function place(values: number[], options: Parameters<typeof pieCallouts>[1]) {
	return pieCallouts(pieSlices(values, options), options)
}

/** Asserts that the ys of one side stay inside `[top, bottom]` and one line apart. */
const expectInBand = vi.defineHelper((ys: number[], top: number, bottom: number) => {
	for (const y of ys) {
		expect(y).toBeGreaterThanOrEqual(top - FLOAT)

		expect(y).toBeLessThanOrEqual(bottom + FLOAT)
	}

	expectLineApart(ys, FLOAT)
})

describe('pieCallouts · the frame band', () => {
	// One label near the top and several near the foot of one side. A slide of
	// the whole run up past `top` and back down again left the last label below
	// `bottom`.
	it('keeps a full side inside the band when its labels crowd the foot', () => {
		const options = { cx: 0, cy: 0, radius: 4, top: -21, bottom: 24 }

		const ys = sideYs(place([2, 1, 1, 0.001, 4, 0.001], options), 'start')

		expect(ys).toHaveLength(4)

		expectInBand(ys, options.top, options.bottom)
	})

	it('keeps the labels of a chart-sized pie inside a band on the leader circle', () => {
		const radius = 60

		const options = {
			cx: 100,
			cy: 100,
			radius,
			top: 100 - radius - CALLOUT_LEADER,
			bottom: 100 + radius + CALLOUT_LEADER,
		}

		for (const anchor of ['start', 'end'] as const) {
			expectInBand(
				sideYs(place([1, 196, 1, 1, 1, 200], options), anchor),
				options.top,
				options.bottom,
			)
		}
	})

	test.prop([
		// A sliver next to large slices puts labels at the top and the foot of one
		// side, which is the case that a single slide of the run got wrong.
		fc.array(
			fc.oneof(
				fc.integer({ min: 1, max: 10_000 }).map((raw) => raw / 10),
				fc.constant(0.001),
			),
			{
				minLength: 1,
				maxLength: 16,
			},
		),
		fc.record({
			cy: fc.integer({ min: 0, max: 600 }),
			radius: fc.integer({ min: 4, max: 300 }),
			// The room that the band adds above and below the leader circle.
			above: fc.integer({ min: 0, max: 200 }),
			below: fc.integer({ min: 0, max: 200 }),
		}),
	])(
		'keeps each label inside the band, one line apart, on each side',
		(values, { cy, radius, above, below }) => {
			const circle = radius + CALLOUT_LEADER

			const options = { cx: 300, cy, radius, top: cy - circle - above, bottom: cy + circle + below }

			for (const anchor of ['start', 'end'] as const) {
				expectInBand(sideYs(place(values, options), anchor), options.top, options.bottom)
			}
		},
	)
})
