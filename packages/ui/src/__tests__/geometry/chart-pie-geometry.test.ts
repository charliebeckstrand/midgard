// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
	CALLOUT_CHAR_WIDTH,
	CALLOUT_GAP,
	CALLOUT_LEADER,
	CALLOUT_LINE,
	CALLOUT_NUB,
	type PieSlice,
	pieCalloutFit,
	pieCallouts,
	pieCentroidRadius,
	pieSlices,
	segmentLabelFits,
} from '../../modules/chart/engine/chart-geometry/pie'
import { estimateTextWidth } from '../../modules/chart/engine/chart-text-width'

/** The distance from a point to the nearest point of a line segment. */
function segmentDistance(
	px: number,
	py: number,
	x0: number,
	y0: number,
	x1: number,
	y1: number,
): number {
	const dx = x1 - x0

	const dy = y1 - y0

	const length = dx * dx + dy * dy

	const t = length > 0 ? Math.min(1, Math.max(0, ((px - x0) * dx + (py - y0) * dy) / length)) : 0

	return Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy))
}

describe('pieCentroidRadius', () => {
	it('pulls a pie label inward as its slice widens', () => {
		// A sliver sits near two-thirds out; a half slice is drawn toward center.
		expect(pieCentroidRadius(80, 0, 0.01)).toBeCloseTo((2 / 3) * 80, 1)

		expect(pieCentroidRadius(80, 0, 0.5)).toBeCloseTo(33.95, 1)

		expect(pieCentroidRadius(80, 0, 0.01)).toBeGreaterThan(pieCentroidRadius(80, 0, 0.5))
	})

	it('collapses a full-circle pie label to the center', () => {
		expect(pieCentroidRadius(80, 0, 1)).toBeCloseTo(0, 5)
	})

	it('holds a donut label on the mid-ring whatever the share', () => {
		expect(pieCentroidRadius(80, 40, 0.1)).toBe(60)

		expect(pieCentroidRadius(80, 40, 0.9)).toBe(60)
	})
})

describe('pieSlices', () => {
	const FRAME = { cx: 100, cy: 100, radius: 80 }

	it('sweeps shares clockwise from the top, proportional to the whole', () => {
		const slices = pieSlices([50, 50], FRAME)

		expect(slices).toHaveLength(2)

		// Two equal shares: the first sweeps 0°→180°, anchoring its centroid at 90° (right).
		expect(slices[0]?.centroid.x).toBeGreaterThan(FRAME.cx)

		expect(slices[1]?.centroid.x).toBeLessThan(FRAME.cx)
	})

	it('skips non-positive and non-finite values', () => {
		const slices = pieSlices([10, -5, null, 0, 30], FRAME)

		expect(slices.map((slice) => slice.index)).toEqual([0, 4])
	})

	it('takes no slice for an infinite value', () => {
		const slices = pieSlices([Number.POSITIVE_INFINITY, 10, 30], FRAME)

		expect(slices.map((slice) => slice.index)).toEqual([1, 2])

		expect(slices.every((slice) => !slice.d.includes('NaN'))).toBe(true)
	})

	it('degenerates a single share to the full circle', () => {
		const [only] = pieSlices([0, 42], FRAME)

		expect(only?.index).toBe(1)

		// Two half arcs, no line back to center.
		expect(only?.d).not.toContain('L')

		expect((only?.d.match(/A /g) ?? []).length).toBe(2)
	})

	it('returns nothing when no value is positive', () => {
		expect(pieSlices([0, null, -3], FRAME)).toHaveLength(0)
	})

	it('parts neighbors with a parallel-offset edge, not a pinch', () => {
		const flush = pieSlices([50, 50], FRAME)

		const padded = pieSlices([50, 50], { ...FRAME, pad: 6 })

		expect(padded).toHaveLength(2)

		// The gap reshapes the wedge but leaves the label/tooltip centroid put.
		expect(padded[0]?.centroid).toEqual(flush[0]?.centroid)

		// The edge is pushed sideways off the true radius by a constant offset,
		// so the channel holds its width instead of pinching shut at the center.
		const startX = (slice?: PieSlice) => Number(slice?.d.match(/^M ([\d.]+)/)?.[1])

		expect(startX(padded[0])).toBeGreaterThan(startX(flush[0]))
	})

	it('runs a sub-half-turn slice to its knife-cut tip on the bisector', () => {
		// Four equal quarters, 6px gap → half 3. The offset edges of a 90° wedge
		// meet at half / sin(45°) ≈ 4.24 from the center, on the bisector.
		const [first] = pieSlices([1, 1, 1, 1], { ...FRAME, pad: 6 })

		const tipRadius = 3 / Math.sin((45 * Math.PI) / 180)

		// The first quarter (0°→90°) bisects at 45°: the tip sits up-and-right.
		const tip = {
			x: FRAME.cx + tipRadius * Math.cos(((45 - 90) * Math.PI) / 180),
			y: FRAME.cy + tipRadius * Math.sin(((45 - 90) * Math.PI) / 180),
		}

		const last = first?.d.match(/L ([\d.]+) ([\d.]+) Z$/)

		expect(Number(last?.[1])).toBeCloseTo(tip.x, 3)

		expect(Number(last?.[2])).toBeCloseTo(tip.y, 3)
	})

	it('hands each slice a gapless hit wedge that runs edge to edge', () => {
		const [first] = pieSlices([1, 1, 1, 1], { ...FRAME, pad: 6 })

		// The visible wedge stops at its knife-cut tip short of the middle; the hit
		// wedge has no gap, so it runs its straight edges to the exact center —
		// claiming the slice's half of every channel, no dead zone in the gap.
		expect(first?.hit).toContain(`L ${FRAME.cx} ${FRAME.cy}`)

		expect(first?.d).not.toContain(`L ${FRAME.cx} ${FRAME.cy}`)
	})

	it('matches the flush wedge for the hit path, gap or no gap', () => {
		// The hit wedge is the pad-0 slice, so a padded pie's hit path is exactly
		// what the same slice draws with no gap at all.
		const flush = pieSlices([50, 30, 20], FRAME)

		const padded = pieSlices([50, 30, 20], { ...FRAME, pad: 8 })

		expect(padded.map((slice) => slice.hit)).toEqual(flush.map((slice) => slice.d))
	})

	it('rides the gap circle for a slice past a half-turn', () => {
		// A dominant slice (> 180°) has no tip; its edges are tangent to the
		// half-radius gap circle, so its inner boundary is an arc of that circle.
		const [big] = pieSlices([80, 20], { ...FRAME, pad: 6 })

		expect(big?.d).toContain('A 3 3 ')
	})

	it('never pads a lone full-circle slice', () => {
		const [only] = pieSlices([0, 42], { ...FRAME, pad: 6 })

		// Still two half arcs, no wedge line to the center.
		expect(only?.d).not.toContain('L')

		expect((only?.d.match(/A /g) ?? []).length).toBe(2)
	})
})

describe('pieCallouts', () => {
	const OPTS = { cx: 100, cy: 100, radius: 60, top: 10, bottom: 190 }

	it('reads right-half labels from the start, left-half from the end', () => {
		const two = pieSlices([50, 50], { cx: 100, cy: 100, radius: 60 })

		const placed = new Map(pieCallouts(two, OPTS).map((callout) => [callout.index, callout]))

		expect(placed.get(0)?.anchor).toBe('start')

		expect(placed.get(1)?.anchor).toBe('end')
	})

	it('stacks crowded labels at least a line apart', () => {
		const many = pieSlices([10, 9, 8, 7, 6, 5], { cx: 100, cy: 100, radius: 60 })

		const ys = pieCallouts(many, OPTS)
			.filter((callout) => callout.anchor === 'start')
			.map((callout) => callout.y)
			.sort((a, b) => a - b)

		for (let i = 1; i < ys.length; i++) {
			expect((ys[i] ?? 0) - (ys[i - 1] ?? 0)).toBeGreaterThanOrEqual(CALLOUT_LINE - 0.001)
		}
	})

	it('holds crowded callouts inside the frame band', () => {
		// One large slice and 24 slivers, which all sit right of the center.
		const values = [100, ...Array.from({ length: 24 }, () => 1)]

		const slices = pieSlices(values, { cx: 150, cy: 100, radius: 60 })

		const placed = pieCallouts(slices, { cx: 150, cy: 100, radius: 60, top: 15, bottom: 185 })

		for (const { y } of placed) {
			expect(y).toBeGreaterThanOrEqual(15)

			expect(y).toBeLessThanOrEqual(185)
		}
	})

	it('keeps each moved callout and its leader off the pie body', () => {
		// Two clusters of slivers sit near 12 o'clock, one on each side of the
		// large slice, so the declump pushes their labels down each side.
		const values = [
			...Array.from({ length: 6 }, () => 1),
			100,
			...Array.from({ length: 6 }, () => 1),
		]

		const center = { cx: 150, cy: 150, radius: 80 }

		const circle = center.radius + CALLOUT_LEADER

		const placed = pieCallouts(pieSlices(values, center), {
			...center,
			top: center.cy - circle,
			bottom: center.cy + circle,
		})

		expect(placed).toHaveLength(values.length)

		for (const callout of placed) {
			// The label anchor sits past the pie body, on or outside the leader circle.
			expect(Math.hypot(callout.x - center.cx, callout.y - center.cy)).toBeGreaterThan(circle)

			// Past its radial first segment, no part of the leader enters the pie body.
			const points = callout.leader.split(' ').map((point) => point.split(',').map(Number))

			for (let at = 2; at < points.length; at++) {
				const [x0, y0] = points[at - 1] as [number, number]

				const [x1, y1] = points[at] as [number, number]

				expect(segmentDistance(center.cx, center.cy, x0, y0, x1, y1)).toBeGreaterThanOrEqual(
					center.radius,
				)
			}
		}

		// The labels of one side stay at least a line apart.
		for (const anchor of ['start', 'end'] as const) {
			const ys = placed
				.filter((callout) => callout.anchor === anchor)
				.map((callout) => callout.y)
				.sort((a, b) => a - b)

			for (let i = 1; i < ys.length; i++) {
				expect((ys[i] ?? 0) - (ys[i - 1] ?? 0)).toBeGreaterThanOrEqual(CALLOUT_LINE - 0.001)
			}
		}
	})

	it('routes a three-point leader with the label a constant gap past its nub', () => {
		const [first] = pieCallouts(pieSlices([60, 40], { cx: 100, cy: 100, radius: 60 }), OPTS)

		const points = first?.leader.split(' ') ?? []

		expect(points).toHaveLength(3)

		// The label sits exactly CALLOUT_GAP beyond the leader's nub, on the start side.
		const nubX = Number(points[2]?.split(',')[0])

		expect((first?.x ?? 0) - nubX).toBeCloseTo(CALLOUT_GAP, 5)
	})
})

describe('pieCalloutFit', () => {
	it('flushes only the outermost callout on each side against the frame, hugging the rest to their own slice', () => {
		const values = [4820, 2210, 1370, 940]

		const total = values.reduce((sum, value) => sum + value, 0)

		const texts = ['Search', 'Direct', 'Referral', 'Social'].map(
			(name, index) => `${name} ${Math.round(((values[index] ?? 0) / total) * 100)}%`,
		)

		const frameWidth = 480

		const fit = pieCalloutFit({
			values,
			texts,
			textWidth: estimateTextWidth(CALLOUT_CHAR_WIDTH),
			frameWidth,
		})

		const slices = pieSlices(values, { cx: fit.cx, cy: 200, radius: fit.radius })

		const callouts = pieCallouts(slices, {
			cx: fit.cx,
			cy: 200,
			radius: fit.radius,
			top: 10,
			bottom: 390,
		})

		// Each callout's far edge: past its nub by the label's own width, outward
		// from center on its side — 0 at the left frame edge, `frameWidth` at right.
		const farEdges = callouts.map((callout) => {
			const extent = (texts[callout.index]?.length ?? 0) * CALLOUT_CHAR_WIDTH

			return callout.anchor === 'start' ? callout.x + extent : callout.x - extent
		})

		expect(Math.max(...farEdges)).toBeCloseTo(frameWidth, 3)

		expect(Math.min(...farEdges)).toBeCloseTo(0, 3)

		// Not every label reaches an edge — only the widest-reaching one per side.
		expect(farEdges.some((edge) => edge > 5 && edge < frameWidth - 5)).toBe(true)
	})

	it('reserves the room that a moved callout takes on its leader circle', () => {
		// Slivers on each side of a large slice sit near 12 o'clock, so the declump
		// moves their labels down the leader circle, away from the center line.
		const values = [
			...Array.from({ length: 6 }, () => 1),
			100,
			...Array.from({ length: 6 }, () => 1),
		]

		const texts = values.map((_, index) => `Source ${index + 1}`)

		const textWidth = estimateTextWidth(CALLOUT_CHAR_WIDTH)

		const frameWidth = 480

		const fit = pieCalloutFit({ values, texts, textWidth, frameWidth })

		const cy = 200

		const circle = fit.radius + CALLOUT_LEADER

		const callouts = pieCallouts(pieSlices(values, { cx: fit.cx, cy, radius: fit.radius }), {
			cx: fit.cx,
			cy,
			radius: fit.radius,
			top: cy - circle,
			bottom: cy + circle,
		})

		expect(callouts).toHaveLength(values.length)

		// Each label's far edge stays inside the frame.
		for (const callout of callouts) {
			const extent = textWidth(texts[callout.index] ?? '')

			const far = callout.anchor === 'start' ? callout.x + extent : callout.x - extent

			expect(far).toBeGreaterThanOrEqual(-1e-6)

			expect(far).toBeLessThanOrEqual(frameWidth + 1e-6)
		}
	})

	it('keeps the callouts inside the frame when the frame height caps the radius', () => {
		// A seeded run of crowded pies. A frame height below the content fit caps the
		// drawn radius under the fit radius, and the labels crowd more there.
		let seed = 7

		const random = () => {
			seed = (seed * 1103515245 + 12345) % 2147483648

			return seed / 2147483648
		}

		const textWidth = estimateTextWidth(CALLOUT_CHAR_WIDTH)

		const band = CALLOUT_LEADER + CALLOUT_LINE

		for (let run = 0; run < 300; run++) {
			const values = [
				60 + random() * 100,
				...Array.from({ length: Math.floor(random() * 30) }, () => 0.2 + random() * 2),
			]

			if (random() < 0.5) values.reverse()

			const texts = values.map(() => 'x'.repeat(2 + Math.floor(random() * 24)))

			const frameWidth = 200 + Math.floor(random() * 800)

			const fit = pieCalloutFit({ values, texts, textWidth, frameWidth })

			const height = Math.round(2 * fit.radius * (0.3 + random() * 0.7) + 2 * band)

			const radius = Math.min(fit.radius, height / 2 - band)

			// Labels too wide for the frame fit no disc, and the chart draws no callout.
			if (radius <= 0) continue

			const cy = height / 2

			const callouts = pieCallouts(pieSlices(values, { cx: fit.cx, cy, radius }), {
				cx: fit.cx,
				cy,
				radius,
				top: CALLOUT_LINE,
				bottom: height - CALLOUT_LINE,
			})

			for (const callout of callouts) {
				const extent = textWidth(texts[callout.index] ?? '')

				const far = callout.anchor === 'start' ? callout.x + extent : callout.x - extent

				expect(far).toBeGreaterThanOrEqual(-1e-6)

				expect(far).toBeLessThanOrEqual(frameWidth + 1e-6)

				expect(Math.hypot(callout.x - fit.cx, callout.y - cy)).toBeGreaterThan(radius)
			}
		}
	})

	it('falls back to a centered, flat-margin radius with fewer than two slices', () => {
		const frameWidth = 300

		const texts = ['Everything 100%']

		const fit = pieCalloutFit({
			values: [42],
			texts,
			textWidth: estimateTextWidth(CALLOUT_CHAR_WIDTH),
			frameWidth,
		})

		expect(fit.cx).toBe(frameWidth / 2)

		expect(fit.radius).toBeCloseTo(
			frameWidth / 2 -
				CALLOUT_LEADER -
				CALLOUT_NUB -
				CALLOUT_GAP -
				(texts[0]?.length ?? 0) * CALLOUT_CHAR_WIDTH,
			5,
		)
	})
})

describe('segmentLabelFits', () => {
	it('admits wide slices and rejects slivers', () => {
		// A quarter slice at centroid radius 60: clearance ≈ 42px.
		expect(segmentLabelFits(3, 0.25, 60, 96, 7.2)).toBe(true)

		// A 2% sliver: clearance ≈ 3.8px can't hold any text.
		expect(segmentLabelFits(2, 0.02, 60, 96, 7.2)).toBe(false)
	})

	it('always admits the full circle and never a too-shallow ring', () => {
		expect(segmentLabelFits(8, 1, 60, 96, 7.2)).toBe(true)

		expect(segmentLabelFits(2, 0.5, 60, 12, 7.2)).toBe(false)
	})
})
