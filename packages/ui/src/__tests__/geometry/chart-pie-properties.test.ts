// @vitest-environment node
import { fc, test } from '@fast-check/vitest'
import { describe, expect } from 'vitest'
import {
	CALLOUT_CHAR_WIDTH,
	CALLOUT_LEADER,
	CALLOUT_LINE,
	pieCalloutFit,
	pieCallouts,
	pieCentroidRadius,
	pieSlices,
} from '../../modules/chart/engine/chart-geometry/pie'
import { estimateTextWidth } from '../../modules/chart/engine/chart-text-width'
import { FLOAT } from '../helpers/geometry/tolerance'

// The tables of `chart-pie-geometry.test.ts` hold the documented examples. The
// properties below read the sweep, the label radius, and the callouts over
// generated series.

/**
 * The slack of a frame position that the callout fit solves by bisection. The
 * fit stops within this bound of the exact edge.
 */
const FIT_TOLERANCE = 1e-6

/** A datum of a pie: a positive value, or one that takes no slice. */
const datum = () =>
	fc.oneof(
		{ arbitrary: fc.integer({ min: 1, max: 10_000 }), weight: 4 },
		{ arbitrary: fc.integer({ min: 1, max: 100_000 }).map((raw) => raw / 1000), weight: 2 },
		{ arbitrary: fc.constantFrom(0, -5, null, Number.NaN, Number.POSITIVE_INFINITY), weight: 1 },
	)

const series = () => fc.array(datum(), { minLength: 1, maxLength: 16 })

/** Whether a datum takes a slice, as the contract of `pieSlices` states. */
const positive = (value: number | null): value is number =>
	value !== null && Number.isFinite(value) && value > 0

const center = () =>
	fc.record({
		cx: fc.integer({ min: 0, max: 600 }),
		cy: fc.integer({ min: 0, max: 600 }),
		radius: fc.integer({ min: 4, max: 300 }),
	})

describe('pieSlices · properties', () => {
	test.prop([series(), center()])(
		'takes one slice for each positive value, in data order, with its part of the whole',
		(values, { cx, cy, radius }) => {
			const slices = pieSlices(values, { cx, cy, radius })

			const kept = values.flatMap((value, index) => (positive(value) ? [index] : []))

			expect(slices.map((slice) => slice.index)).toEqual(kept)

			const total = kept.reduce((sum, index) => sum + (values[index] as number), 0)

			for (const slice of slices) {
				expect(slice.share).toBeNear((values[slice.index] as number) / total, FLOAT)
			}

			if (slices.length > 0) {
				expect(slices.reduce((sum, slice) => sum + slice.share, 0)).toBeNear(1, FLOAT)
			}
		},
	)

	// A mid-angle is the start of a slice plus half its sweep. The slices are
	// contiguous from the top exactly when each gap between two mid-angles is the
	// two half sweeps, and the last slice ends on the full turn.
	test.prop([series(), center()])(
		'sweeps the slices edge to edge, clockwise from the top, over the full turn',
		(values, { cx, cy, radius }) => {
			const slices = pieSlices(values, { cx, cy, radius })

			fc.pre(slices.length > 0)

			const half = (share: number) => share * 180

			const first = slices[0] as (typeof slices)[number]

			const last = slices.at(-1) as (typeof slices)[number]

			expect(first.mid - half(first.share)).toBeNear(0, FLOAT)

			for (let at = 1; at < slices.length; at++) {
				const a = slices[at - 1] as (typeof slices)[number]

				const b = slices[at] as (typeof slices)[number]

				expect(b.mid - a.mid).toBeNear(half(a.share) + half(b.share), FLOAT)
			}

			expect(last.mid + half(last.share)).toBeNear(360, FLOAT)
		},
	)

	test.prop([series(), center(), fc.integer({ min: 0, max: 90 })])(
		'anchors each slice on its bisector, at the label radius',
		(values, { cx, cy, radius }, hole) => {
			const innerRadius = (radius * hole) / 100

			for (const slice of pieSlices(values, { cx, cy, radius, innerRadius })) {
				const reach = pieCentroidRadius(radius, innerRadius, slice.share)

				const radians = (slice.mid * Math.PI) / 180

				expect(slice.centroid.x).toBeNear(cx + reach * Math.sin(radians), FLOAT)

				expect(slice.centroid.y).toBeNear(cy - reach * Math.cos(radians), FLOAT)
			}
		},
	)
})

describe('pieCentroidRadius · properties', () => {
	const share = () => fc.integer({ min: 0, max: 10_000 }).map((raw) => raw / 10_000)

	test.prop([
		fc.integer({ min: 2, max: 400 }),
		fc.integer({ min: 1, max: 99 }).map((percent) => percent / 100),
		share(),
	])('holds a donut label between the inner and the outer radius', (radius, hole, part) => {
		const inner = radius * hole

		const reach = pieCentroidRadius(radius, inner, part)

		expect(reach).toBeGreaterThan(inner)

		expect(reach).toBeLessThan(radius)
	})

	// The area centroid of a sector runs from two thirds of the radius for a
	// sliver to the center for the full circle, and moves in as the share grows.
	test.prop([fc.integer({ min: 1, max: 400 }), share(), share()])(
		'pulls a pie label in from two thirds of the radius as its share grows',
		(radius, a, b) => {
			const [small, large] = a <= b ? [a, b] : [b, a]

			const near = pieCentroidRadius(radius, 0, small)

			const far = pieCentroidRadius(radius, 0, large)

			expect(near).toBeLessThanOrEqual((2 / 3) * radius + FLOAT)

			expect(far).toBeGreaterThanOrEqual(-FLOAT)

			expect(far).toBeLessThanOrEqual(near + FLOAT)
		},
	)
})

describe('pieCallouts · properties', () => {
	/**
	 * A pie and the band of its frame. The real chart caps the radius so that the
	 * leader circle stays inside the band, and the band here does the same. Its
	 * edges sit zero to 80 px past the circle.
	 */
	const scene = () =>
		fc.record({
			values: series(),
			center: center(),
			above: fc.nat({ max: 80 }),
			below: fc.nat({ max: 80 }),
		})

	type Scene = ReturnType<typeof scene> extends fc.Arbitrary<infer T> ? T : never

	const place = ({ values, center: at, above, below }: Scene) => {
		const circle = at.radius + CALLOUT_LEADER

		const top = at.cy - circle - above

		const bottom = at.cy + circle + below

		const slices = pieSlices(values, at)

		return { slices, callouts: pieCallouts(slices, { ...at, top, bottom }) }
	}

	test.prop([scene()])('gives each callout a slice of its own', (input) => {
		const { slices, callouts } = place(input)

		const indexes = callouts.map((callout) => callout.index)

		expect(new Set(indexes).size).toBe(indexes.length)

		const sliced = new Set(slices.map((slice) => slice.index))

		for (const index of indexes) expect(sliced.has(index)).toBe(true)
	})

	test.prop([scene()])('stacks the labels of one side at least a line apart', (input) => {
		for (const anchor of ['start', 'end'] as const) {
			const ys = place(input)
				.callouts.filter((callout) => callout.anchor === anchor)
				.map((callout) => callout.y)
				.sort((a, b) => a - b)

			for (let at = 1; at < ys.length; at++) {
				expect((ys[at] as number) - (ys[at - 1] as number)).toBeGreaterThanOrEqual(
					CALLOUT_LINE - FLOAT,
				)
			}
		}
	})

	// The leader starts on the rim, so each vertex sits on the rim or past it.
	test.prop([scene()])('keeps each leader vertex and each label off the pie body', (input) => {
		const { cx, cy, radius } = input.center

		for (const callout of place(input).callouts) {
			const points = callout.leader.split(' ').map((point) => point.split(',').map(Number))

			for (const [x, y] of points as [number, number][]) {
				expect(Math.hypot(x - cx, y - cy)).toBeGreaterThanOrEqual(radius - FLOAT)
			}

			expect(Math.hypot(callout.x - cx, callout.y - cy)).toBeGreaterThan(radius)
		}
	})
})

describe('pieCalloutFit · properties', () => {
	const textWidth = estimateTextWidth(CALLOUT_CHAR_WIDTH)

	/** The band that the chart reserves above and below the leader circle. */
	const BAND = CALLOUT_LEADER + CALLOUT_LINE

	test.prop([
		fc.array(fc.integer({ min: 1, max: 1000 }), { minLength: 2, maxLength: 16 }),
		fc.array(fc.integer({ min: 1, max: 24 }), { minLength: 16, maxLength: 16 }),
		fc.integer({ min: 200, max: 1000 }),
		fc.integer({ min: 30, max: 150 }).map((percent) => percent / 100),
	])(
		'lands each callout inside the frame width at the fit radius or less',
		(values, lengths, frameWidth, stretch) => {
			const texts = values.map((_, index) => 'x'.repeat(lengths[index] as number))

			const fit = pieCalloutFit({ values, texts, textWidth, frameWidth })

			// A frame height under the content fit caps the drawn radius, as the chart does.
			const height = Math.round(2 * fit.radius * stretch + 2 * BAND)

			const radius = Math.min(fit.radius, height / 2 - BAND)

			fc.pre(radius > 0)

			const cy = height / 2

			const slices = pieSlices(values, { cx: fit.cx, cy, radius })

			const callouts = pieCallouts(slices, {
				cx: fit.cx,
				cy,
				radius,
				top: CALLOUT_LINE,
				bottom: height - CALLOUT_LINE,
			})

			for (const callout of callouts) {
				const extent = textWidth(texts[callout.index] ?? '')

				const far = callout.anchor === 'start' ? callout.x + extent : callout.x - extent

				expect(far).toBeGreaterThanOrEqual(-FIT_TOLERANCE)

				expect(far).toBeLessThanOrEqual(frameWidth + FIT_TOLERANCE)
			}
		},
	)
})
