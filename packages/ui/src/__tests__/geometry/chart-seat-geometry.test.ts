// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
	discsPath,
	majorityAngle,
	majorityLine,
	nearestSeat,
	SEAT_INNER_RATIO,
	seatFit,
	seatGroups,
	seatHole,
	seatLayout,
	seatRows,
} from '../../modules/chart/engine/chart-geometry/seat'

/** A coordinate in unit space that trigonometry gives carries rounding below this bound. */
const UNIT_TOLERANCE = 1e-9

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

		expect(seatLayout(0, 3)).toEqual({ seats: [], dot: 0 })
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

describe('majorityAngle', () => {
	it('stands between the last seat of the majority and the next seat', () => {
		const { seats } = seatLayout(100, 5)

		const angle = majorityAngle(seats, 51)

		expect(angle).not.toBeNull()

		// The 51st seat is index 50, and the next seat index 51.
		expect(angle).toBeLessThanOrEqual(seats[50]?.angle ?? 0)

		expect(angle).toBeGreaterThanOrEqual(seats[51]?.angle ?? Math.PI)
	})

	it('is null without a majority inside the chamber', () => {
		const { seats } = seatLayout(10, 2)

		expect(majorityAngle(seats, undefined)).toBeNull()

		expect(majorityAngle(seats, 0)).toBeNull()

		expect(majorityAngle(seats, 10)).toBeNull()

		expect(majorityAngle(seats, 5.5)).toBeNull()
	})

	it('ticks past the outer arc, clear of every seat', () => {
		const layout = seatLayout(100, 5)

		const line = majorityLine(Math.PI / 2, layout)

		expect(line.x1).toBeNear(0, UNIT_TOLERANCE)

		expect(-line.y1).toBeGreaterThan(1 + layout.dot)

		expect(-line.y2).toBeGreaterThan(-line.y1)
	})
})

describe('seatFit', () => {
	it('fits the hemicycle and its line inside the box', () => {
		const layout = seatLayout(435, 10)

		const fit = seatFit(400, 200, 4, layout.dot, true)

		const line = majorityLine(Math.PI / 2, layout)

		expect(fit.cx).toBe(200)

		expect(fit.cx - (1 + layout.dot) * fit.scale).toBeGreaterThanOrEqual(4 - 1e-9)

		expect(fit.cy + line.y2 * fit.scale).toBeGreaterThanOrEqual(4 - 1e-9)

		expect(fit.cy + layout.dot * fit.scale).toBeLessThanOrEqual(196 + 1e-9)
	})

	it('takes more of the box with no tick to hold', () => {
		const dot = seatLayout(435, 10).dot

		expect(seatFit(400, 200, 4, dot).scale).toBeGreaterThan(seatFit(400, 200, 4, dot, true).scale)
	})

	it('scales to nothing in a box with no room', () => {
		expect(seatFit(0, 0, 4, 0.02).scale).toBe(0)
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
