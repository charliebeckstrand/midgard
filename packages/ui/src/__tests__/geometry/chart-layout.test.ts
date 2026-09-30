// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
	AXIS_TITLE_BAND,
	AXIS_TITLE_GAP,
	BAND_EDGE_PAD,
	FLOOR_LABEL_PAD,
	GUTTER_GAP,
	GUTTER_LABEL_ROOM,
	GUTTER_MAX,
	LINE_STROKE_WIDTH,
	MARKER_RADIUS,
	MARKER_RING_WIDTH,
	PLOT_TOP_PAD,
	TICK_CHAR_WIDTH,
	TICK_ROTATION_HEIGHT,
	X_AXIS_HEIGHT,
} from '../../modules/chart/engine/chart-constants'
import {
	axisTitleAt,
	bandTicksOf,
	type CartesianLayoutInput,
	horizontalLayout,
	lineMarkReach,
	plotRect,
	thinned,
	valueAxisRange,
	valueTicksOf,
	verticalLayout,
} from '../../modules/chart/engine/chart-layout'
import { bandScale } from '../../modules/chart/engine/chart-scale'

/**
 * A band scale and a value scale divide the plot span, so a case checks an edge
 * to two decimal places of a frame unit.
 */
const PLOT_EDGE_TOLERANCE = 0.005

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

	it('keeps the far extreme clear when one side widens and grows the span', () => {
		// A one-sided widen grows the span, so the other unpinned extreme can fall
		// under its share of the range. The low label then flips onto the line,
		// the failure the reservation exists to prevent.
		for (let frameHeight = 100; frameHeight <= 400; frameHeight += 1) {
			const layout = verticalLayout({
				...input(frameHeight, 25),
				tickTarget: 2,
				value: { domainValues: [23, 100], format: String },
			})

			const scale = layout.valueScale

			if (!scale || !layout.valueLabelRoom) continue

			expect(scale.map(100) - layout.plot.y).toBeGreaterThan(21)

			expect(layout.plot.y + layout.plot.height - scale.map(23)).toBeGreaterThan(21)
		}
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

describe('verticalLayout band-edge inset', () => {
	it('holds the first and last category the margin off the plot sides', () => {
		const layout = verticalLayout(input(300, 0))

		const { band, plot } = layout

		// The band range is inset a fixed margin at both ends, so the first slot's
		// left edge and the last slot's right edge sit BAND_EDGE_PAD inside the plot
		// — an edge label never crowds the value gutter, and the span stays centered.
		expect(band.center(0) - band.step / 2 - plot.x).toBeNear(BAND_EDGE_PAD, PLOT_EDGE_TOLERANCE)

		expect(plot.x + plot.width - (band.center(5) + band.step / 2)).toBeNear(
			BAND_EDGE_PAD,
			PLOT_EDGE_TOLERANCE,
		)
	})
})

describe('horizontalLayout value bands', () => {
	it('reserves no bottom band when every series binds the secondary axis', () => {
		// The primary axis stands down when nothing binds to it, as the vertical
		// layout drops its left gutter. The band under the plot then holds no ticks,
		// so the plot takes its height back.
		const layout = horizontalLayout({
			...input(300, 0),
			value: undefined,
			value2: { domainValues: [12, -6, 9], format: String },
		})

		expect(layout.valueScale).toBeNull()

		expect(layout.plot.y + layout.plot.height).toBe(300)

		expect(layout.plot.y).toBe(PLOT_TOP_PAD + X_AXIS_HEIGHT)
	})
})

describe('bandTicksOf tilted labels', () => {
	it('thins a tilted run by the room each rotated label takes along the axis', () => {
		// Sixty categories along 740px, about 12px a band. Each tilted label needs
		// its line box across the slant, about 28px along the axis. Before, every
		// label tilted, and the run overlapped.
		const categories = Array.from({ length: 60 }, (_, index) => `Category ${index + 1}`)

		const band = bandScale({ count: 60, range: [0, 740] })

		const ticks = bandTicksOf(categories, band, 740, 0, true)

		expect(ticks.length).toBeLessThan(60)

		expect(ticks.every((tick) => tick.rotate !== undefined)).toBe(true)

		const gaps = ticks.slice(1).map((tick, index) => tick.at - (ticks[index]?.at ?? 0))

		expect(Math.min(...gaps)).toBeGreaterThanOrEqual(27)
	})

	it('keeps every tilted label where the bands leave room', () => {
		const categories = ['January Sales', 'February Sales', 'March Sales', 'April Sales']

		const ticks = bandTicksOf(categories, bandScale({ count: 4, range: [0, 400] }), 400, 0, true)

		expect(ticks).toHaveLength(4)
	})
})

describe('verticalLayout tilt', () => {
	/** A layout input of `categories` along a 600px frame, with the tilt asked for. */
	const tilted = (categories: string[]): CartesianLayoutInput => ({
		...input(300, 0),
		frameWidth: 600,
		categories,
		count: categories.length,
		tickRotation: true,
	})

	it('keeps short labels flat, where a tilt would keep fewer of them', () => {
		// Two-letter codes thin flat at about 20px. A tilted label takes about 28px,
		// so a tilt showed fewer labels and still reserved the taller band.
		const codes = Array.from({ length: 40 }, (_, index) => `C${index}`.slice(0, 2))

		const layout = verticalLayout(tilted(codes))

		expect(layout.bandTicks.every((tick) => tick.rotate === undefined)).toBe(true)
	})

	it('tilts long labels, where a tilt keeps more of them', () => {
		const names = Array.from({ length: 40 }, (_, index) => `Category number ${index + 1}`)

		const layout = verticalLayout(tilted(names))

		expect(layout.bandTicks.every((tick) => tick.rotate !== undefined)).toBe(true)
	})
})

describe('plotRect', () => {
	it('reserves a tick gutter and the x-axis band with axes on, and fills the frame with axes off', () => {
		const framed = plotRect(300, 200, true, ['1,000'])

		expect(framed.x).toBeGreaterThan(0)

		expect(framed.height).toBe(200 - PLOT_TOP_PAD - X_AXIS_HEIGHT)

		expect(plotRect(300, 200, false, ['1,000'])).toEqual({
			x: 0,
			y: PLOT_TOP_PAD,
			width: 300,
			height: 200 - PLOT_TOP_PAD,
		})
	})

	it('sizes a proportional gutter to the widest drawn label', () => {
		const width = (label: string) => label.length * 5

		expect(plotRect(300, 200, true, ['North', 'Southwest'], width).x).toBe(45 + GUTTER_GAP)
	})

	it('reserves no proportional gutter when no label has a width', () => {
		const rect = plotRect(300, 200, true, [], () => 0)

		expect(rect.x).toBe(0)

		expect(rect.width).toBe(300)
	})
})

describe('thinned', () => {
	it('keeps no index for an empty axis', () => {
		expect(thinned(0, 400, 20)).toEqual([])
	})
})

describe('axisTitleAt', () => {
	const plot = { x: 40, y: 8, width: 200, height: 100 }

	const half = AXIS_TITLE_BAND / 2

	it('rotates a side title into its gutter at the frame edge, centered on the plot height', () => {
		expect(axisTitleAt('left', 'Revenue', plot, 300)).toEqual({
			text: 'Revenue',
			x: half,
			y: 58,
			rotate: -90,
		})

		expect(axisTitleAt('right', 'Share', plot, 300)).toEqual({
			text: 'Share',
			x: 300 - half,
			y: 58,
			rotate: 90,
		})
	})

	it('centers a top or bottom title on the plot width, past the tick-label band', () => {
		expect(axisTitleAt('top', 'Share', plot, 300)).toEqual({
			text: 'Share',
			x: 140,
			y: 8 - X_AXIS_HEIGHT - half,
			rotate: 0,
		})

		expect(axisTitleAt('bottom', 'Month', plot, 300)).toEqual({
			text: 'Month',
			x: 140,
			y: 108 + X_AXIS_HEIGHT + half,
			rotate: 0,
		})

		// A tilted band row is taller, and the title moves past it.
		expect(axisTitleAt('bottom', 'Month', plot, 300, TICK_ROTATION_HEIGHT).y).toBe(
			108 + TICK_ROTATION_HEIGHT + half,
		)
	})
})

describe('lineMarkReach', () => {
	it('reaches the ring edge of a point marker, else the half-width of the stroke', () => {
		expect(lineMarkReach(true)).toBe(MARKER_RADIUS + MARKER_RING_WIDTH / 2)

		expect(lineMarkReach(false)).toBe(LINE_STROKE_WIDTH / 2)
	})
})

describe('valueTicksOf', () => {
	it('places no tick without a scale', () => {
		expect(valueTicksOf(null, String)).toEqual([])
	})
})

describe('valueAxisRange', () => {
	const probe = { ticks: [0, 100], format: String }

	it('insets each end by the half-width of its end label', () => {
		// `0` is one glyph and `100` is three, so the right end takes more room.
		const [from, to] = valueAxisRange([probe], [0, 200])

		expect(from).toBeGreaterThan(0)

		expect(200 - to).toBeGreaterThan(from)
	})

	it('keeps the span when no axis has a tick', () => {
		expect(valueAxisRange([], [0, 200])).toEqual([0, 200])

		expect(valueAxisRange([{ ticks: [], format: String }], [0, 200])).toEqual([0, 200])
	})

	it('keeps the span when the frame is too narrow to seat both end labels', () => {
		expect(valueAxisRange([probe], [0, 20])).toEqual([0, 20])
	})
})

describe('verticalLayout without axes', () => {
	const spark = (frameWidth: number, markInset?: number): CartesianLayoutInput => ({
		...input(200, 0),
		frameWidth,
		axes: false,
		markInset,
	})

	it('fills the frame and insets the band by the mark reach', () => {
		const layout = verticalLayout(spark(400, 6.5))

		expect(layout.plot).toEqual({ x: 0, y: PLOT_TOP_PAD, width: 400, height: 200 - PLOT_TOP_PAD })

		expect(layout.band.center(0) - layout.band.step / 2).toBeNear(6.5, PLOT_EDGE_TOLERANCE)

		const scale = layout.valueScale

		expect(scale?.map(scale.domain[0])).toBeNear(200 - 6.5, PLOT_EDGE_TOLERANCE)
	})

	it('reserves no inset for a mark that ends at its coordinate', () => {
		const layout = verticalLayout(spark(400))

		expect(layout.band.center(0) - layout.band.step / 2).toBeNear(0, PLOT_EDGE_TOLERANCE)

		const scale = layout.valueScale

		expect(scale?.map(scale.domain[0])).toBeNear(200, PLOT_EDGE_TOLERANCE)
	})

	it('keeps the band span where the frame is too narrow to seat both insets', () => {
		const layout = verticalLayout(spark(10, 6.5))

		// An inverted band would put the last center before the first.
		expect(layout.band.center(5)).toBeGreaterThan(layout.band.center(0))

		expect(layout.band.center(0) - layout.band.step / 2).toBeNear(0, PLOT_EDGE_TOLERANCE)
	})

	it('reads the label-room verdict from the range between the mark insets', () => {
		// Without axes, the floor is the frame less the top pad. With axes, the
		// floor also loses the band row, so the axes-off verdict at H matches the
		// framed verdict at H + X_AXIS_HEIGHT.
		for (let frameHeight = 40; frameHeight <= 200; frameHeight += 1) {
			const bare = verticalLayout({ ...input(frameHeight, 25), axes: false })

			const framed = verticalLayout(input(frameHeight + X_AXIS_HEIGHT, 25))

			expect(bare.valueLabelRoom).toBe(framed.valueLabelRoom)
		}
	})
})

describe('verticalLayout label-room floor', () => {
	it('subtracts the tilted band row, and the band title, from the floor', () => {
		for (let frameHeight = 60; frameHeight <= 300; frameHeight += 1) {
			const plain = (height: number) => verticalLayout(input(height, 25)).valueLabelRoom

			const tilted = verticalLayout({ ...input(frameHeight, 25), tickRotation: true })

			const titled = verticalLayout({ ...input(frameHeight, 25), bandTitle: 'Month' })

			expect(tilted.valueLabelRoom).toBe(
				plain(frameHeight - (TICK_ROTATION_HEIGHT - X_AXIS_HEIGHT)),
			)

			expect(titled.valueLabelRoom).toBe(plain(frameHeight - AXIS_TITLE_BAND))
		}
	})

	it('reserves no tilted band row on a time axis', () => {
		const times = [0, 1, 2, 3, 4, 5].map((month) => Date.UTC(2026, month, 1))

		for (let frameHeight = 60; frameHeight <= 300; frameHeight += 1) {
			const plain = verticalLayout({ ...input(frameHeight, 25), times }).valueLabelRoom

			const tilted = verticalLayout({ ...input(frameHeight, 25), times, tickRotation: true })

			expect(tilted.valueLabelRoom).toBe(plain)
		}
	})
})

describe('verticalLayout band modes', () => {
	const withCategories = (categories: string[]): CartesianLayoutInput => ({
		...input(300, 0),
		categories,
		count: categories.length,
		bandAxis: 'ends',
	})

	it('shows only the first and last label in an ends band, each anchored inward', () => {
		const ticks = verticalLayout(input(300, 0)).bandTicks.length

		const ends = verticalLayout({ ...input(300, 0), bandAxis: 'ends' }).bandTicks

		expect(ticks).toBeGreaterThan(2)

		expect(ends.map((tick) => [tick.label, tick.anchor])).toEqual([
			['a', 'start'],
			['f', 'end'],
		])
	})

	it('centers the one label of a single-category ends band', () => {
		const [tick, ...rest] = verticalLayout(withCategories(['Only'])).bandTicks

		expect(rest).toEqual([])

		expect(tick?.label).toBe('Only')

		expect(tick?.anchor).toBeUndefined()
	})

	it('draws no label for an empty ends band', () => {
		expect(verticalLayout(withCategories([])).bandTicks).toEqual([])
	})

	it('drops the band row and its title, and keeps a floor pad for the zero label', () => {
		const layout = verticalLayout({ ...input(300, 0), bandAxis: 'off', bandTitle: 'Month' })

		expect(layout.bandTicks).toEqual([])

		expect(layout.titles).toEqual([])

		expect(layout.plot.height).toBe(300 - PLOT_TOP_PAD - FLOOR_LABEL_PAD)
	})
})

describe('verticalLayout time axis', () => {
	it('draws calendar ticks in place of the category labels', () => {
		const times = [0, 1, 2, 3, 4, 5].map((month) => Date.UTC(2026, month, 15))

		const layout = verticalLayout({ ...input(300, 0), frameWidth: 600, times, locale: 'en-US' })

		expect(layout.bandTicks.length).toBeGreaterThan(0)

		expect(layout.bandTicks.some((tick) => /^[a-f]$/.test(tick.label))).toBe(false)
	})

	it('falls back to the category labels when no row carries a date', () => {
		const layout = verticalLayout({ ...input(300, 0), times: [null, null, null, null, null, null] })

		expect(layout.bandTicks.map((tick) => tick.label)).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
	})
})

describe('verticalLayout axis titles', () => {
	const dual: CartesianLayoutInput = {
		...input(300, 0),
		value: { domainValues: [0, 120], format: String, title: 'Revenue' },
		value2: { domainValues: [0, 1], format: String, title: 'Share' },
		bandTitle: 'Month',
	}

	it('places each value title in its gutter and the band title under the labels', () => {
		const layout = verticalLayout(dual)

		const { plot } = layout

		expect(layout.titles.map((title) => [title.text, title.rotate])).toEqual([
			['Revenue', -90],
			['Share', 90],
			['Month', 0],
		])

		expect(layout.titles[2]?.y).toBe(plot.y + plot.height + X_AXIS_HEIGHT + AXIS_TITLE_BAND / 2)
	})

	it('widens each titled gutter by the title band and its gap', () => {
		const titled = verticalLayout(dual)

		const bare = verticalLayout({
			...dual,
			value: { domainValues: [0, 120], format: String },
			value2: { domainValues: [0, 1], format: String },
		})

		expect(titled.plot.x - bare.plot.x).toBe(AXIS_TITLE_BAND + AXIS_TITLE_GAP)

		expect(bare.plot.width - titled.plot.width).toBe(2 * (AXIS_TITLE_BAND + AXIS_TITLE_GAP))
	})

	it('places no value title without axes', () => {
		expect(verticalLayout({ ...dual, axes: false }).titles).toEqual([])
	})
})

describe('verticalLayout snap targets', () => {
	it('drops a gap, and a series whose axis has no scale, from both snap lists', () => {
		const layout = verticalLayout({
			...input(300, 0),
			visibleValues: [
				{ values: [1, null, 3, 4, 5, 6], axis: 'y', index: 0 },
				{ values: [2, 2, Number.NaN, 2, 2, 2], axis: 'y', index: 1 },
				{ values: [9, 9, 9, 9, 9, 9], axis: 'y2', index: 2 },
			],
		})

		expect(layout.snapSeries.slice(0, 3)).toEqual([[0, 1], [1], [0]])

		expect(layout.snapPoints.map((points) => points.length)).toEqual(
			layout.snapSeries.map((series) => series.length),
		)

		expect(layout.snapPoints[1]).toEqual([layout.valueScale?.map(2)])
	})
})

describe('verticalLayout baselines', () => {
	it('takes the zero line of the secondary scale when only it resolves', () => {
		const layout = verticalLayout({
			...input(300, 0),
			zeroBaseline: true,
			value: undefined,
			value2: { domainValues: [4, 9], format: String },
			visibleValues: [{ values: [4, 5, 6, 7, 8, 9], axis: 'y2', index: 0 }],
		})

		expect(layout.valueScale).toBeNull()

		expect(layout.baseline).toBe(layout.value2Scale?.map(0))

		expect(layout.value2Baseline).toBe(layout.baseline)

		expect(layout.snapSeries[0]).toEqual([0])
	})

	it('falls back to the plot floor and places no snap target without a scale', () => {
		const layout = verticalLayout({
			...input(300, 0),
			value: undefined,
			visibleValues: [{ values: [1, 2, 3, 4, 5, 6], axis: 'y', index: 0 }],
		})

		expect(layout.baseline).toBe(layout.plot.y + layout.plot.height)

		expect(layout.value2Baseline).toBe(layout.baseline)

		expect(layout.snapPoints).toEqual([])

		expect(layout.snapSeries).toEqual([])
	})
})

describe('horizontalLayout gutter and titles', () => {
	const categories = ['a', 'A long middle category', 'b']

	const base: CartesianLayoutInput = {
		...input(300, 0),
		categories,
		count: categories.length,
	}

	it('sizes an ends gutter to the first and last label only', () => {
		const thinnedBand = horizontalLayout(base)

		const ends = horizontalLayout({ ...base, bandAxis: 'ends' })

		expect(ends.plot.x).toBeLessThan(thinnedBand.plot.x)

		expect(ends.bandTicks.map((tick) => tick.label)).toEqual(['a', 'b'])
	})

	it('frees the gutter, and drops the band title, when the band is off', () => {
		const layout = horizontalLayout({ ...base, bandAxis: 'off', bandTitle: 'Region' })

		expect(layout.plot.x).toBe(0)

		expect(layout.titles).toEqual([])
	})

	it('sizes the gutter to the drawn label width and draws each label as it fits', () => {
		const layout = horizontalLayout({
			...base,
			bandLabel: { width: () => 30, fit: (label) => label.slice(0, 3) },
		})

		expect(layout.plot.x).toBe(30 + GUTTER_GAP)

		expect(layout.bandTicks.map((tick) => tick.label)).toEqual(['a', 'A l', 'b'])
	})

	it('places the value titles under and over the plot, and the band title in the far gutter', () => {
		const layout = horizontalLayout({
			...base,
			value: { domainValues: [0, 120], format: String, title: 'Revenue' },
			value2: { domainValues: [0, 1], format: String, title: 'Share' },
			bandTitle: 'Region',
		})

		expect(layout.titles.map((title) => [title.text, title.rotate])).toEqual([
			['Revenue', 0],
			['Share', 0],
			['Region', -90],
		])

		// Each value band holds its tick row and its title band.
		expect(layout.plot.y).toBe(PLOT_TOP_PAD + X_AXIS_HEIGHT + AXIS_TITLE_BAND)

		expect(layout.plot.y + layout.plot.height).toBe(300 - X_AXIS_HEIGHT - AXIS_TITLE_BAND)

		const untitled = horizontalLayout(base)

		expect(layout.plot.x - untitled.plot.x).toBe(AXIS_TITLE_BAND + AXIS_TITLE_GAP)
	})

	it('places no value title without axes', () => {
		const layout = horizontalLayout({
			...base,
			axes: false,
			value: { domainValues: [0, 120], format: String, title: 'Revenue' },
			value2: { domainValues: [0, 1], format: String, title: 'Share' },
		})

		expect(layout.titles).toEqual([])
	})
})

describe('horizontalLayout without axes', () => {
	it('fills the frame and insets the value range by the mark reach', () => {
		const layout = horizontalLayout({ ...input(300, 0), axes: false, markInset: 6.5 })

		expect(layout.plot).toEqual({ x: 0, y: PLOT_TOP_PAD, width: 400, height: 300 - PLOT_TOP_PAD })

		const scale = layout.valueScale

		expect(scale?.map(scale.domain[0])).toBeNear(6.5, PLOT_EDGE_TOLERANCE)

		expect(scale?.map(scale.domain[1])).toBeNear(400 - 6.5, PLOT_EDGE_TOLERANCE)
	})
})

describe('horizontalLayout value-label room', () => {
	it('grants the room on a wide value range and withholds it on a narrow one', () => {
		expect(horizontalLayout({ ...input(300, 25), frameWidth: 600 }).valueLabelRoom).toBe(true)

		expect(horizontalLayout({ ...input(300, 25), frameWidth: 90 }).valueLabelRoom).toBe(false)
	})
})

describe('cartesian layout', () => {
	const input: CartesianLayoutInput = {
		frameWidth: 400,
		frameHeight: 240,
		axes: true,
		tickTarget: 4,
		zeroBaseline: true,
		value: { domainValues: [0, 40, 80], format: (value) => String(value) },
		categories: ['Q1', 'Q2'],
		count: 2,
		visibleValues: [{ values: [40, 80], axis: 'y', index: 0 }],
	}

	it('runs value up y and the band across x when vertical', () => {
		const layout = verticalLayout(input)

		// Zero sits on the plot floor; the ceiling tick sits above it.
		expect(layout.baseline).toBeNear(layout.plot.y + layout.plot.height, PLOT_EDGE_TOLERANCE)

		expect(layout.valueTicks.at(-1)?.at).toBeLessThan(layout.baseline)

		// Band centers fall inside the horizontal plot span.
		for (const position of layout.bandPositions) {
			expect(position).toBeGreaterThanOrEqual(layout.plot.x)

			expect(position).toBeLessThanOrEqual(layout.plot.x + layout.plot.width)
		}
	})

	it('runs value along x and the band down y when horizontal', () => {
		const layout = horizontalLayout(input)

		// Zero sits at the left edge; the ceiling tick sits to its right.
		expect(layout.baseline).toBeNear(layout.plot.x, PLOT_EDGE_TOLERANCE)

		expect(layout.valueTicks.at(-1)?.at).toBeGreaterThan(layout.baseline)

		// Band centers fall inside the vertical plot span.
		for (const position of layout.bandPositions) {
			expect(position).toBeGreaterThanOrEqual(layout.plot.y)

			expect(position).toBeLessThanOrEqual(layout.plot.y + layout.plot.height)
		}
	})

	it('sizes the horizontal gutter from the drawn band labels and cuts one past the room', () => {
		// A drawn label wider than the room comes back cut, and its cut width fills
		// the room. The gutter then stops at GUTTER_MAX.
		const bandLabel = {
			width: (label: string) => (label === 'Organic search' ? GUTTER_LABEL_ROOM : 40),
			fit: (label: string) => (label === 'Organic search' ? 'Organic se…' : label),
		}

		const layout = horizontalLayout({
			...input,
			count: 2,
			categories: ['Organic search', 'Direct'],
			bandLabel,
		})

		expect(layout.plot.x).toBe(GUTTER_MAX)

		expect(layout.bandTicks.map((tick) => tick.label)).toEqual(['Organic se…', 'Direct'])

		// Short labels hold only their width and the gap.
		const short = horizontalLayout({ ...input, count: 2, categories: ['Q1', 'Q2'], bandLabel })

		expect(short.plot.x).toBe(40 + GUTTER_GAP)
	})

	it('names the series behind each snap stop, aligned to the points through a gap', () => {
		// Series 0 drops out at the second category, so its stop vanishes there; the
		// positions and the series map must drop it from the very same slot, or the
		// keyboard cursor would read the surviving series against the wrong lane.
		const gapped: CartesianLayoutInput = {
			...input,
			count: 2,
			categories: ['Q1', 'Q2'],
			visibleValues: [
				{ values: [40, null], axis: 'y', index: 0 },
				{ values: [60, 80], axis: 'y', index: 1 },
			],
		}

		const layout = verticalLayout(gapped)

		// Q1 carries both series in order; Q2 keeps only series 1 — the same slot the
		// position map drops, so a stop and its series index stay paired.
		expect(layout.snapSeries).toEqual([[0, 1], [1]])

		expect(layout.snapPoints[1]).toHaveLength(1)

		expect(layout.snapSeries[1]).toHaveLength(layout.snapPoints[1]?.length ?? 0)
	})

	it('insets the horizontal value axis so its centered end labels clear the frame', () => {
		// Wide currency-style ticks (0 … 6,000) on a narrow frame — the last label
		// centered on the plot's right edge is exactly what overhangs the SVG clip.
		const layout = horizontalLayout({
			...input,
			frameWidth: 480,
			value: {
				domainValues: [0, 4820, 6000],
				format: (value) => value.toLocaleString('en-US'),
			},
			categories: ['Search', 'Direct'],
		})

		const halfLabel = (tick: { label: string }) => (tick.label.length * TICK_CHAR_WIDTH) / 2

		const first = layout.valueTicks.at(0)

		const last = layout.valueTicks.at(-1)

		// Both end labels stay within [0, frameWidth] rather than spilling past the edge.
		expect((first?.at ?? 0) - halfLabel(first ?? { label: '' })).toBeGreaterThanOrEqual(0)

		expect((last?.at ?? 0) + halfLabel(last ?? { label: '' })).toBeLessThanOrEqual(480)

		// The inset pulls the ceiling tick off the plot's right edge.
		expect(last?.at ?? 0).toBeLessThan(layout.plot.x + layout.plot.width)
	})
})
