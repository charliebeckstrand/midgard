// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { CALLOUT_LINE } from '../../modules/chart/engine/chart-geometry/pie'
import {
	discsPath,
	majorityLabel,
	majorityMark,
	nearestSeat,
	SEAT_INNER_RATIO,
	seatExtent,
	seatFit,
	seatGroups,
	seatHole,
	seatLayout,
	seatRows,
} from '../../modules/chart/engine/chart-geometry/seat'

/** A coordinate in unit space that trigonometry gives carries rounding below this bound. */
const UNIT_TOLERANCE = 1e-9

/** A coordinate in px in the frame carries the rounding of the unit space, scaled by a few hundred px. */
const PX_TOLERANCE = 1e-6

describe('seatRows', () => {
	it('takes 4 rows for 50 seats, 5 for 100, and 10 for 435', () => {
		expect([50, 100, 435].map(seatRows)).toEqual([4, 5, 10])
	})

	it('takes at least one row', () => {
		expect(seatRows(0)).toBe(1)

		expect(seatRows(1)).toBe(1)
	})
})

describe('seatLayout', () => {
	it('places each seat once, on the arcs from the inner ratio out to 1', () => {
		const { seats, dot } = seatLayout(435, 10)

		expect(seats).toHaveLength(435)

		expect(dot).toBeGreaterThan(0)

		const radii = [...new Set(seats.map((seat) => seat.radius.toFixed(6)))].map(Number)

		expect(radii).toHaveLength(10)

		expect(Math.min(...radii)).toBeNear(SEAT_INNER_RATIO, UNIT_TOLERANCE)

		expect(Math.max(...radii)).toBeNear(1, UNIT_TOLERANCE)

		for (const seat of seats) {
			expect(Math.hypot(seat.x, seat.y)).toBeNear(seat.radius, UNIT_TOLERANCE)

			expect(seat.y).toBeLessThanOrEqual(1e-9)
		}
	})

	it('orders the seats from the start of the hemicycle to the end', () => {
		const { seats } = seatLayout(100, 5)

		for (let index = 1; index < seats.length; index++) {
			const prev = seats[index - 1]

			const seat = seats[index]

			if (!prev || !seat) throw new Error('expected two seats')

			expect(seat.angle).toBeLessThanOrEqual(prev.angle + 1e-9)
		}

		expect(seats[0]?.x).toBeLessThan(0)

		expect(seats.at(-1)?.x).toBeGreaterThan(0)
	})

	it('keeps neighbors apart: no two seats overlap', () => {
		for (const [total, rows] of [
			[50, 4],
			[100, 5],
			[435, 10],
			[7, 3],
		] as const) {
			const { seats, dot } = seatLayout(total, rows)

			for (let a = 0; a < seats.length; a++) {
				for (let b = a + 1; b < seats.length; b++) {
					const one = seats[a]

					const two = seats[b]

					if (!one || !two) continue

					expect(Math.hypot(one.x - two.x, one.y - two.y)).toBeGreaterThanOrEqual(2 * dot - 1e-9)
				}
			}
		}
	})

	it('puts a lone seat at the top, and draws nothing for no seats', () => {
		const lone = seatLayout(1, 3)

		expect(lone.seats).toHaveLength(1)

		expect(lone.seats[0]?.x).toBeNear(0, UNIT_TOLERANCE)

		expect(lone.seats[0]?.y).toBeNear(-1, UNIT_TOLERANCE)

		expect(seatLayout(0, 3)).toEqual({ seats: [], dot: 0, aisle: null })
	})
})

describe('seatLayout with a majority', () => {
	/** The distance from a seat to the line down the aisle, which runs out from the center. */
	function fromAisle(seat: { angle: number; radius: number }, aisle: number): number {
		const turn = seat.angle - aisle

		return Math.cos(turn) > 0 ? Math.abs(seat.radius * Math.sin(turn)) : seat.radius
	}

	it('opens the aisle before the seat that makes the majority', () => {
		for (const [total, majority] of [
			[100, 51],
			[435, 218],
			[435, 290],
			[56, 29],
		] as const) {
			const { seats, aisle } = seatLayout(total, seatRows(total), majority)

			if (aisle === null) throw new Error('expected an aisle')

			expect(seats).toHaveLength(total)

			expect(seats.filter((seat) => seat.angle > aisle)).toHaveLength(majority - 1)

			expect(seats[majority - 2]?.angle).toBeGreaterThan(aisle)

			expect(seats[majority - 1]?.angle).toBeLessThan(aisle)
		}
	})

	it('puts the aisle of a simple majority down the middle', () => {
		expect(seatLayout(100, 5, 51).aisle).toBeNear(Math.PI / 2, UNIT_TOLERANCE)

		expect(seatLayout(56, 4, 29).aisle).toBeNear(Math.PI / 2, UNIT_TOLERANCE)
	})

	it('keeps each seat clear of the line down the aisle, and no two seats overlap', () => {
		for (const [total, majority] of [
			[50, 26],
			[100, 51],
			[435, 218],
			[435, 2],
			[9, 5],
		] as const) {
			const { seats, dot, aisle } = seatLayout(total, seatRows(total), majority)

			if (aisle === null) throw new Error('expected an aisle')

			for (const seat of seats) expect(fromAisle(seat, aisle)).toBeGreaterThan(dot)

			for (let a = 0; a < seats.length; a++) {
				for (let b = a + 1; b < seats.length; b++) {
					const one = seats[a]

					const two = seats[b]

					if (!one || !two) continue

					expect(Math.hypot(one.x - two.x, one.y - two.y)).toBeGreaterThanOrEqual(2 * dot - 1e-9)
				}
			}
		}
	})

	it('has no aisle without a majority inside the chamber', () => {
		for (const majority of [undefined, 0, 1, 11, 5.5]) {
			expect(seatLayout(10, 2, majority).aisle).toBeNull()
		}

		// A chamber of two seats has no room for an aisle.
		expect(seatLayout(2, 1, 2).aisle).toBeNull()

		// Without an aisle, the seats are the seats of a chamber with no majority.
		expect(seatLayout(10, 2, 11)).toEqual(seatLayout(10, 2))
	})

	it('accepts the whole chamber as the majority', () => {
		const { seats, aisle } = seatLayout(10, 2, 10)

		expect(seats.filter((seat) => aisle !== null && seat.angle < aisle)).toHaveLength(1)
	})
})

describe('seatGroups', () => {
	it('gives the seats to the groups in order, and the rest to none', () => {
		expect(seatGroups([2, 0, 1], 5)).toEqual([0, 0, 2, -1, -1])
	})

	it('stops at the chamber size', () => {
		expect(seatGroups([3, 3], 4)).toEqual([0, 0, 0, 1])
	})
})

describe('majorityMark', () => {
	it('dashes the line from past the outer arc down to the hole', () => {
		const layout = seatLayout(100, 5, 51)

		const mark = majorityMark(layout)

		if (!mark) throw new Error('expected a mark')

		const first = mark.dashes[0]

		const last = mark.dashes.at(-1)

		if (!first || !last) throw new Error('expected dashes')

		expect(first.x1).toBeNear(0, UNIT_TOLERANCE)

		expect(-first.y1).toBeGreaterThan(1 + layout.dot)

		expect(-last.y2).toBeNear(seatHole(layout), UNIT_TOLERANCE)

		// Each dash runs down the line, and a gap parts it from the next dash.
		mark.dashes.forEach((dash, index) => {
			expect(dash.y2).toBeGreaterThan(dash.y1)

			const next = mark.dashes[index + 1]

			if (next) expect(next.y1).toBeGreaterThan(dash.y2)
		})
	})

	it('points the tip of the marker down the line, above the outer seats', () => {
		const layout = seatLayout(100, 5, 51)

		const [tip, one, two] = majorityMark(layout)?.marker ?? []

		if (!tip || !one || !two) throw new Error('expected a marker')

		expect(tip.x).toBeNear(0, UNIT_TOLERANCE)

		expect(tip.y).toBeNear(majorityMark(layout)?.dashes[0]?.y1 ?? 0, UNIT_TOLERANCE)

		expect(one.y).toBeNear(two.y, UNIT_TOLERANCE)

		expect(one.y).toBeLessThan(tip.y)

		expect((one.x + two.x) / 2).toBeNear(0, UNIT_TOLERANCE)
	})

	it('is null with no aisle', () => {
		expect(majorityMark(seatLayout(100, 5))).toBeNull()
	})
})

describe('seatFit', () => {
	/** The top of the marker, in unit space. */
	function markerTop(layout: ReturnType<typeof seatLayout>): number {
		return Math.min(...(majorityMark(layout)?.marker ?? []).map((point) => point.y))
	}

	it('fits the hemicycle and its marker inside the box', () => {
		const layout = seatLayout(435, 10, 218)

		const fit = seatFit(400, 200, 4, seatExtent(layout))

		expect(fit.cx).toBe(200)

		expect(fit.cx - (1 + layout.dot) * fit.scale).toBeGreaterThanOrEqual(4 - 1e-9)

		expect(fit.cy + markerTop(layout) * fit.scale).toBeGreaterThanOrEqual(4 - 1e-9)

		expect(fit.cy + layout.dot * fit.scale).toBeLessThanOrEqual(196 + 1e-9)
	})

	it('widens the box for a marker near the end of the hemicycle', () => {
		const layout = seatLayout(435, 10, 2)

		const extent = seatExtent(layout)

		for (const point of majorityMark(layout)?.marker ?? []) {
			expect(point.x).toBeGreaterThanOrEqual(-extent.across / 2 - UNIT_TOLERANCE)

			expect(point.x).toBeLessThanOrEqual(extent.across / 2 + UNIT_TOLERANCE)
		}

		expect(extent.across).toBeGreaterThan(2 * (1 + layout.dot))
	})

	it('takes more of the box with no marker to hold', () => {
		expect(seatFit(400, 200, 4, seatExtent(seatLayout(435, 10))).scale).toBeGreaterThan(
			seatFit(400, 200, 4, seatExtent(seatLayout(435, 10, 218))).scale,
		)
	})

	it('scales to nothing in a box with no room', () => {
		expect(seatFit(0, 0, 4, seatExtent(seatLayout(10, 2))).scale).toBe(0)
	})

	it('keeps a line above the marker for its label', () => {
		const layout = seatLayout(435, 10, 218)

		const fit = seatFit(400, 200, 4, seatExtent(layout), true)

		expect(fit.cy + markerTop(layout) * fit.scale).toBeGreaterThanOrEqual(CALLOUT_LINE - 1e-9)

		expect(fit.cy + layout.dot * fit.scale).toBeLessThanOrEqual(196 + 1e-9)
	})
})

describe('majorityLabel', () => {
	function place(majority: number, width: number, height: number, textWidth = 60) {
		const layout = seatLayout(435, 10, majority)

		const mark = majorityMark(layout)

		if (!mark) throw new Error('expected a mark')

		const fit = seatFit(width, height, 4, seatExtent(layout), true)

		return {
			mark,
			fit,
			label: majorityLabel({ mark, layout, fit, width, height, margin: 4, textWidth }),
		}
	}

	it('sits centered over the marker, a line above its top', () => {
		const { mark, fit, label } = place(218, 400, 200)

		const [, one, two] = mark.marker

		expect(label?.x).toBeNear(fit.cx + ((one.x + two.x) / 2) * fit.scale, PX_TOLERANCE)

		expect(label?.y).toBeLessThan(fit.cy + one.y * fit.scale - CALLOUT_LINE / 2)

		expect((label?.y ?? 0) - CALLOUT_LINE / 2).toBeGreaterThanOrEqual(-PX_TOLERANCE)
	})

	it('hides where the label does not fit above the marker', () => {
		// The label runs past the side of the frame.
		expect(place(218, 400, 200, 400).label).toBeNull()

		// The marker near the end of the hemicycle leaves the label on the seats or past the frame.
		expect(place(435, 400, 200, 60).label).toBeNull()
	})

	it('hides with no text and in a frame with no room', () => {
		expect(place(218, 400, 200, 0).label).toBeNull()

		expect(place(218, 0, 0, 60).label).toBeNull()
	})
})

describe('seatHole', () => {
	it('keeps a gap of one seat between the hole and each seat', () => {
		const layout = seatLayout(435, 10)

		const hole = seatHole(layout)

		for (const seat of layout.seats) {
			expect(Math.hypot(seat.x, seat.y) - layout.dot - hole).toBeGreaterThanOrEqual(
				layout.dot - UNIT_TOLERANCE,
			)
		}
	})

	it('has no hole with no seat', () => {
		expect(seatHole(seatLayout(0, 1))).toBe(0)
	})
})

describe('nearestSeat', () => {
	it('names the nearest seat within reach, and none past it', () => {
		const { seats, dot } = seatLayout(100, 5)

		const seat = seats[10]

		if (!seat) throw new Error('expected a seat')

		expect(nearestSeat(seats, seat.x + dot / 2, seat.y, dot * 2)).toBe(10)

		expect(nearestSeat(seats, 0, 0, dot * 2)).toBeNull()
	})
})

describe('discsPath', () => {
	it('draws one disc per point, as two half arcs', () => {
		expect(discsPath([{ x: 10, y: 20 }], 2)).toBe('M8 20a2 2 0 1 0 4 0a2 2 0 1 0 -4 0')

		expect(discsPath([], 2)).toBe('')
	})
})
