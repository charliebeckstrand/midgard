// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { BarMark } from '../../modules/chart/engine/chart-geometry/bar'
import { TRACE_STEP, traceRun } from '../../modules/chart/engine/chart-geometry/line'
import {
	barMarkAt,
	nearestSeriesArea,
	type ThinMark,
	thinMarkAt,
} from '../../modules/chart/engine/chart-hit-test'

const bar = (x: number, x1: number, top: number, bottom: number): BarMark => ({
	d: '',
	x,
	x1,
	top,
	bottom,
	positive: true,
})

describe('barMarkAt', () => {
	it('hits inside a bar and misses the air beside and above it', () => {
		const marks = [[bar(10, 30, 50, 100), null]]

		expect(barMarkAt(marks, 20, 75)).not.toBeNull()

		// Just past the right edge, and above the top.
		expect(barMarkAt(marks, 31, 75)).toBeNull()

		expect(barMarkAt(marks, 20, 49)).toBeNull()
	})

	it('applies the gap slack down y for a horizontal chart', () => {
		// Two horizontal bars 2px apart down the band axis: rows |50..70| and |72..92|,
		// each spanning x 10..30. The gap between them is now vertical.
		const group = [[bar(10, 30, 50, 70)], [bar(10, 30, 72, 92)]]

		// y=71 falls in the vertical gap: a miss without slack.
		expect(barMarkAt(group, 20, 71, 0, 'horizontal')).toBeNull()

		// The slack closes it along y, not x.
		expect(barMarkAt(group, 20, 71, 2, 'horizontal')).not.toBeNull()

		// Off the value end (past x=30) stays a miss however wide the band slack.
		expect(barMarkAt(group, 40, 60, 2, 'horizontal')).toBeNull()
	})

	it('returns the series and datum of the bar under the pointer', () => {
		const marks = [[bar(10, 30, 50, 100), bar(40, 60, 50, 100)]]

		expect(barMarkAt(marks, 50, 75)).toEqual({ series: 0, datum: 1 })

		expect(barMarkAt(marks, 35, 75)).toBeNull()
	})

	it("isolates the bar whose body the pointer covers, not a widened neighbor's span", () => {
		// Bars |10..30| and |31..51| a pixel apart; the pointer sits on the second's
		// body while the first's gap-widened span (to 32) also reaches it.
		const group = [[bar(10, 30, 50, 100)], [bar(31, 51, 50, 100)]]

		expect(barMarkAt(group, 31.5, 75, 2)).toEqual({ series: 1, datum: 0 })
	})

	it('bridges the gap between grouped bars only on the widened pass', () => {
		const group = [[bar(10, 30, 50, 100)], [bar(32, 52, 50, 100)]]

		// x=31 falls in the bare 2px gap: no body catches it.
		expect(barMarkAt(group, 31, 75)).toBeNull()

		// The widened pass reaches it, resolving to the nearer-first series.
		expect(barMarkAt(group, 31, 75, 2)).toEqual({ series: 0, datum: 0 })

		// The slack still ends at the group: the wider space beyond stays a miss.
		expect(barMarkAt(group, 60, 75, 2)).toBeNull()

		// And it never reaches above the bars.
		expect(barMarkAt(group, 31, 40, 2)).toBeNull()
	})
})

/** A straight run between two points. */
const segment = (x0: number, y0: number, x1: number, y1: number) => [
	{ x: x0, y: y0 },
	{ x: x1, y: y1 },
]

/** A flat line at `y` from x 0 to x 100, as the one run of one line. */
const flat = (y: number) => [segment(0, y, 100, y)]

describe('thinMarkAt', () => {
	it('catches a line within the catch, in a straight line, and misses beyond it', () => {
		expect(thinMarkAt([flat(100)], [], 50, 112)).toEqual({ line: 0 })

		expect(thinMarkAt([flat(100)], [], 50, 117)).toBeNull()

		// A steep line catches as wide across as a flat one does along y.
		const steep = [segment(50, 0, 51, 200)]

		expect(thinMarkAt([steep], [], 62, 100)).toEqual({ line: 0 })

		expect(thinMarkAt([steep], [], 70, 100)).toBeNull()
	})

	it('gives the pointer to the line nearest along the value axis', () => {
		expect(thinMarkAt([flat(100), flat(140)], [], 50, 108)).toEqual({ line: 0 })

		expect(thinMarkAt([flat(100), flat(140)], [], 50, 132)).toEqual({ line: 1 })
	})

	it('parts two crossing lines at the line of their mean slope', () => {
		// They cross at (100, 100): a steep line of slope 4, and a flat one.
		const steep = [segment(75, 0, 125, 200)]

		const level = [segment(0, 100, 200, 100)]

		// The mean slope is 2, so the boundary runs through (105, 110). Below it
		// along y, toward the flat line, the flat line takes the pointer, though the
		// pointer is nearer the steep line in a straight line.
		expect(thinMarkAt([steep, level], [], 105, 109)).toEqual({ line: 1 })

		expect(thinMarkAt([steep, level], [], 105, 111)).toEqual({ line: 0 })

		// The order of the lines does not move the boundary.
		expect(thinMarkAt([level, steep], [], 105, 109)).toEqual({ line: 0 })

		expect(thinMarkAt([level, steep], [], 105, 111)).toEqual({ line: 1 })
	})

	it('reads past an end of a run by the straight distance to the end', () => {
		// The run ends at x 40. A pointer 9 px past the end and 9 px above it sits
		// 12.7 px from the end. A flat line 12 px below the pointer is nearer.
		const short = [segment(0, 100, 40, 100)]

		expect(thinMarkAt([short, flat(121)], [], 49, 109)).toEqual({ line: 1 })

		// At the end itself, the two distances agree: 9 px along y.
		expect(thinMarkAt([short, flat(121)], [], 40, 109)).toEqual({ line: 0 })
	})

	it('never bridges the gap between runs, but catches a lone point', () => {
		const gappy = [segment(0, 100, 40, 100), [{ x: 120, y: 100 }]]

		expect(thinMarkAt([gappy], [], 80, 100)).toBeNull()

		expect(thinMarkAt([gappy], [], 122, 102)).toEqual({ line: 0 })
	})

	it('reads a rule along the value axis, within the same catch', () => {
		expect(thinMarkAt([], [100], 50, 116)).toEqual({ rule: 0 })

		expect(thinMarkAt([], [100], 50, 117)).toBeNull()

		// A rule that takes no pointer is never caught.
		expect(thinMarkAt([], [null, 100], 50, 101)).toEqual({ rule: 1 })
	})

	it('parts a line and a rule midway along the value axis', () => {
		expect(thinMarkAt([flat(110)], [100], 50, 104)).toEqual({ rule: 0 })

		expect(thinMarkAt([flat(110)], [100], 50, 106)).toEqual({ line: 0 })
	})

	it('gives a tie to a line over a rule, and to the later line', () => {
		expect(thinMarkAt([flat(100)], [100], 50, 100)).toEqual({ line: 0 })

		expect(thinMarkAt([flat(100), flat(100)], [], 50, 100)).toEqual({ line: 1 })

		expect(thinMarkAt([flat(96), flat(104)], [], 50, 100)).toEqual({ line: 1 })

		expect(thinMarkAt([], [100, 100], 50, 100)).toEqual({ rule: 1 })
	})

	it('holds the held mark until another comes 2 px nearer', () => {
		// Lines at y 100 and y 120: the boundary at 110.
		const lines = [flat(100), flat(120)]

		// Held line 0 at 10.75 px against line 1 at 9.25 px: not 2 px nearer.
		expect(thinMarkAt(lines, [], 50, 110.75, { line: 0 })).toEqual({ line: 0 })

		// At 11.25 px against 8.75 px, line 1 takes the pointer.
		expect(thinMarkAt(lines, [], 50, 111.25, { line: 0 })).toEqual({ line: 1 })

		// The hold works from the other side, and between a rule and a line.
		expect(thinMarkAt(lines, [], 50, 109.25, { line: 1 })).toEqual({ line: 1 })

		expect(thinMarkAt(lines, [], 50, 108.75, { line: 1 })).toEqual({ line: 0 })

		expect(thinMarkAt([flat(120)], [100], 50, 110.75, { rule: 0 })).toEqual({ rule: 0 })

		expect(thinMarkAt([flat(120)], [100], 50, 111.25, { rule: 0 })).toEqual({ line: 0 })

		// A held mark out of the catch holds nothing.
		expect(thinMarkAt([flat(100), flat(140)], [], 50, 125, { line: 0 })).toEqual({ line: 1 })
	})

	it('holds the held mark 2 px past the edge of the catch', () => {
		expect(thinMarkAt([flat(100)], [], 50, 117.5)).toBeNull()

		expect(thinMarkAt([flat(100)], [], 50, 117.5, { line: 0 })).toEqual({ line: 0 })

		expect(thinMarkAt([flat(100)], [], 50, 118.5, { line: 0 })).toBeNull()

		expect(thinMarkAt([], [100], 50, 82.5, { rule: 0 })).toEqual({ rule: 0 })

		expect(thinMarkAt([], [100], 50, 81.5, { rule: 0 })).toBeNull()
	})

	it('flips once in each direction when the pointer sweeps across a crossing', () => {
		const steep = [segment(75, 0, 125, 200)]

		const level = [segment(0, 100, 200, 100)]

		// Sweep along y through the crossing column and back, carrying the held mark.
		const sweep = (from: number, to: number, start: ThinMark | null) => {
			let held = start

			let flips = 0

			const step = from < to ? 0.25 : -0.25

			for (let y = from; from < to ? y <= to : y >= to; y += step) {
				// A shake of half a px at each step, as a hand makes.
				for (const shake of [0, 0.5, -0.5, 0]) {
					const next = thinMarkAt([steep, level], [], 104, y + shake, held)

					if (held !== null && next !== null && next.line !== held.line) flips++

					held = next
				}
			}

			return { held, flips }
		}

		const down = sweep(85, 115, null)

		expect(down.flips).toBe(1)

		const up = sweep(115, 85, down.held)

		expect(up.flips).toBe(1)
	})
})

describe('traceRun', () => {
	it('keeps a straight run, and a curve of fewer than three points, as its points', () => {
		const run = [
			{ x: 0, y: 0 },
			{ x: 50, y: 40 },
			{ x: 100, y: 10 },
		]

		expect(traceRun(run, 'linear')).toBe(run)

		expect(traceRun(run.slice(0, 2), 'smooth')).toEqual(run.slice(0, 2))
	})

	it('follows the drawn curve in chords of at most the trace step', () => {
		const run = [
			{ x: 0, y: 100 },
			{ x: 40, y: 20 },
			{ x: 80, y: 60 },
			{ x: 120, y: 0 },
		]

		const trace = traceRun(run, 'smooth')

		// The trace passes through each point of the run.
		for (const point of run) {
			expect(trace.some((p) => p.x === point.x && Math.abs(p.y - point.y) < 1e-9)).toBe(true)
		}

		// Each chord is at most the trace step long, so the trace bends with the curve.
		for (let i = 1; i < trace.length; i++) {
			const a = trace[i - 1] as { x: number; y: number }

			const b = trace[i] as { x: number; y: number }

			expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeLessThanOrEqual(TRACE_STEP + 1e-9)
		}

		// A monotone curve stays inside the box of each two points of the run.
		for (const p of trace) {
			expect(p.y).toBeGreaterThanOrEqual(0)

			expect(p.y).toBeLessThanOrEqual(100)
		}
	})
})

describe('nearestSeriesArea', () => {
	// Two stacked ribbons' top edges: series 0 higher (y=60), series 1 below (y=120).
	const stack = [
		[
			[
				{ x: 0, y: 60 },
				{ x: 100, y: 60 },
			],
		],
		[
			[
				{ x: 0, y: 120 },
				{ x: 100, y: 120 },
			],
		],
	]

	it('picks the ribbon whose top edge sits nearest above the pointer', () => {
		// Below both tops: the lower ribbon (top 120) is the one the pointer sits in.
		expect(nearestSeriesArea(stack, 200, 50, 150)).toBe(1)

		// Between the tops: only the upper ribbon covers here.
		expect(nearestSeriesArea(stack, 200, 50, 90)).toBe(0)

		// Above every top (past the edge slack): inside no fill.
		expect(nearestSeriesArea(stack, 200, 50, 30)).toBeNull()
	})

	it('reads the stroke slack by its distance, as the inside of a wash', () => {
		// Series 0 tops out at y=64, series 1 at y=60, both washing down to y=200.
		const close = [
			[
				[
					{ x: 0, y: 64 },
					{ x: 100, y: 64 },
				],
			],
			[
				[
					{ x: 0, y: 60 },
					{ x: 100, y: 60 },
				],
			],
		]

		// 1px inside series 1, 3px above series 0 in its stroke slack.
		expect(nearestSeriesArea(close, 200, 50, 61)).toBe(1)

		// 3px inside series 1, 1px above series 0.
		expect(nearestSeriesArea(close, 200, 50, 63)).toBe(0)
	})

	const runs = [
		[
			[
				{ x: 0, y: 60 },
				{ x: 100, y: 40 },
			],
		],
	]

	it('hits between the top edge and the baseline, with edge slack', () => {
		expect(nearestSeriesArea(runs, 200, 50, 120)).not.toBeNull()

		// The stroke itself, just above the interpolated edge at x=50 (y=50).
		expect(nearestSeriesArea(runs, 200, 50, 47)).not.toBeNull()

		expect(nearestSeriesArea(runs, 200, 50, 40)).toBeNull()

		expect(nearestSeriesArea(runs, 200, 50, 201)).toBeNull()
	})

	it('misses x outside the run', () => {
		expect(nearestSeriesArea(runs, 200, 120, 120)).toBeNull()
	})

	// A negative series draws its line below its zero line (y=100), and its wash
	// fills up from the line to that zero line.
	const negative = [
		[
			[
				{ x: 0, y: 150 },
				{ x: 100, y: 150 },
			],
		],
	]

	it('hits a negative wash between its line and its zero line, not the band below', () => {
		expect(nearestSeriesArea(negative, () => 100, 50, 125)).toBe(0)

		// The line itself, with the edge slack past it.
		expect(nearestSeriesArea(negative, () => 100, 50, 152)).toBe(0)

		// Under the line, where no wash draws.
		expect(nearestSeriesArea(negative, () => 100, 50, 180)).toBeNull()

		// A positive series misses under its zero line too.
		expect(nearestSeriesArea(runs, () => 100, 50, 150)).toBeNull()
	})

	it('reads a stacked ribbon between its top edge and the edge below it', () => {
		const edge = (y: number) => [
			[
				{ x: 0, y },
				{ x: 100, y },
			],
		]

		// A positive stack: series 1 rides on series 0, so its top edge sits higher.
		const positive = [edge(120), edge(60)]

		expect(nearestSeriesArea(positive, 200, 50, 150, true)).toBe(0)

		expect(nearestSeriesArea(positive, 200, 50, 90, true)).toBe(1)

		expect(nearestSeriesArea(positive, 200, 50, 30, true)).toBeNull()

		// Series 1 adds a negative value, so its ribbon folds back down over the fill
		// of series 0. It paints later, so it wins where the two overlap.
		const signed = [edge(60), edge(90)]

		expect(nearestSeriesArea(signed, 200, 50, 65, true)).toBe(1)

		expect(nearestSeriesArea(signed, 200, 50, 85, true)).toBe(1)

		expect(nearestSeriesArea(signed, 200, 50, 150, true)).toBe(0)
	})
})
