import { describe, expect, it } from 'vitest'
import { type CartesianLayoutInput, verticalLayout } from '../../modules/chart/chart-layout'

const input = (frameHeight: number, valueHeadroom: number): CartesianLayoutInput => ({
	frameWidth: 400,
	frameHeight,
	axes: true,
	tickTarget: 4,
	zeroBaseline: false,
	value: { domainValues: [12, -6, 9, -14, 18, 7], format: String },
	categories: ['a', 'b', 'c', 'd', 'e', 'f'],
	count: 6,
	visibleValues: [],
	valueHeadroom,
})

describe('verticalLayout value-label room', () => {
	it('grants room that clears the flip threshold, or withholds it — never in between', () => {
		// The invariant the reservation exists for: at any frame height, either
		// the layout grants the label room AND every data extreme maps far enough
		// from the plot edge that the 21px label flip can never trigger, or it
		// withholds the room and the chart sheds its labels whole. No height
		// leaves a label rendering against an unreserved edge — the granted /
		// withheld verdict and the scale's reservation come from one predicate
		// over one range, so they cannot disagree.
		let granted = 0

		let withheld = 0

		for (let frameHeight = 60; frameHeight <= 400; frameHeight += 1) {
			const layout = verticalLayout(input(frameHeight, 25))

			const scale = layout.valueScale

			if (!scale) throw new Error('scale must resolve')

			if (!layout.valueLabelRoom) {
				withheld += 1

				continue
			}

			granted += 1

			expect(scale.map(18) - layout.plot.y).toBeGreaterThan(21)

			expect(layout.plot.y + layout.plot.height - scale.map(-14)).toBeGreaterThan(21)
		}

		// The sweep crosses the affordability cutoff, so both regimes are exercised.
		expect(granted).toBeGreaterThan(0)

		expect(withheld).toBeGreaterThan(0)
	})

	it('always grants the room when none is asked', () => {
		expect(verticalLayout(input(80, 0)).valueLabelRoom).toBe(true)
	})

	it('gives one verdict whichever band the tier wears, so shrinking never re-shows labels', () => {
		// The tier drops the band row at a smaller size, handing its height back
		// to the plot — the actual range GROWS as the frame shrinks. A verdict
		// read from the actual range would flip hidden → shown → hidden across
		// that boundary; reading the floor under the tallest band instead makes
		// the verdict band-independent, so it can only move one way in a shrink.
		for (let frameHeight = 60; frameHeight <= 400; frameHeight += 1) {
			const thinned = verticalLayout({ ...input(frameHeight, 25), bandAxis: 'thinned' })

			const ends = verticalLayout({ ...input(frameHeight, 25), bandAxis: 'ends' })

			const off = verticalLayout({ ...input(frameHeight, 25), bandAxis: 'off' })

			expect(ends.valueLabelRoom).toBe(thinned.valueLabelRoom)

			expect(off.valueLabelRoom).toBe(thinned.valueLabelRoom)
		}
	})

	it('withholds the reservation with the verdict, so a shed label pads no domain', () => {
		// Under the cutoff the labels hide — and the domain must stay at its
		// plain nice bounds rather than reserve room for labels that never draw.
		// The band-off layout at a height whose actual range could afford the
		// room, but whose floor cannot, is exactly the mid-shrink flash window.
		const layout = verticalLayout({ ...input(120, 25), bandAxis: 'off' })

		expect(layout.valueLabelRoom).toBe(false)

		const bare = verticalLayout({ ...input(120, 0), bandAxis: 'off' })

		expect(layout.valueScale?.domain).toEqual(bare.valueScale?.domain)
	})
})
