import { describe, expect, it } from 'vitest'
import {
	AXIS_TITLE_HEIGHT,
	AXIS_TITLE_WIDTH,
	BAND_ROW_HEIGHT,
	COMPACT_HEIGHT,
	COMPACT_WIDTH,
	chartPolicy,
	EXPANDED_WIDTH,
	MIN_TICK_TARGET,
	SPARK_HEIGHT,
	SPARK_WIDTH,
	TICK_SPACING,
	TWO_ROW_LEGEND_HEIGHT,
} from '../../modules/chart/chart-tier'

// A roomy density cap, so the height-driven tick target is what varies unless a
// test pins the cap itself.
const CAP = 5

describe('chartPolicy tier', () => {
	it('reads spark below either spark bound', () => {
		expect(chartPolicy(SPARK_WIDTH - 1, 300, CAP).tier).toBe('spark')

		expect(chartPolicy(400, SPARK_HEIGHT - 1, CAP).tier).toBe('spark')
	})

	it('reads compact from the spark bound up to either compact bound', () => {
		// The spark boundary itself is the first compact size.
		expect(chartPolicy(SPARK_WIDTH, 300, CAP).tier).toBe('compact')

		expect(chartPolicy(COMPACT_WIDTH - 1, 300, CAP).tier).toBe('compact')

		// A wide but short box is compact by height, not width.
		expect(chartPolicy(700, COMPACT_HEIGHT - 1, CAP).tier).toBe('compact')
	})

	it('reads standard from the compact bounds up to the expanded width', () => {
		expect(chartPolicy(COMPACT_WIDTH, COMPACT_HEIGHT, CAP).tier).toBe('standard')

		expect(chartPolicy(EXPANDED_WIDTH - 1, 300, CAP).tier).toBe('standard')
	})

	it('reads expanded at or above the expanded width', () => {
		expect(chartPolicy(EXPANDED_WIDTH, 400, CAP).tier).toBe('expanded')

		expect(chartPolicy(1200, 700, CAP).tier).toBe('expanded')
	})
})

describe('chartPolicy value axis', () => {
	it('drops the gutter at spark and keeps it otherwise', () => {
		expect(chartPolicy(SPARK_WIDTH - 1, 300, CAP).valueAxis).toBe('off')

		expect(chartPolicy(COMPACT_WIDTH - 1, 300, CAP).valueAxis).toBe('gutter')

		expect(chartPolicy(800, 400, CAP).valueAxis).toBe('gutter')
	})
})

describe('chartPolicy band axis', () => {
	it('thins labels in a wide box', () => {
		expect(chartPolicy(COMPACT_WIDTH, 300, CAP).bandAxis).toBe('thinned')
	})

	it('shows only the ends in a compact-width box', () => {
		expect(chartPolicy(COMPACT_WIDTH - 1, 300, CAP).bandAxis).toBe('ends')
	})

	it('drops the band row below the band-row height even while the gutter stays', () => {
		// A short, wide banner: band row gone, value gutter kept — the two bind to
		// different dimensions, so a single breakpoint could not say both.
		const policy = chartPolicy(800, BAND_ROW_HEIGHT - 1, CAP)

		expect(policy.bandAxis).toBe('off')

		expect(policy.valueAxis).toBe('gutter')
	})

	it('drops the band at spark', () => {
		expect(chartPolicy(SPARK_WIDTH - 1, 300, CAP).bandAxis).toBe('off')
	})
})

describe('chartPolicy tick target', () => {
	it('targets zero ticks at spark', () => {
		expect(chartPolicy(SPARK_WIDTH - 1, 300, CAP).tickTarget).toBe(0)
	})

	it('drives the target off height, one tick per spacing', () => {
		// 300 / 44 floors to 6, under the cap of 5 → capped at 5; 220 / 44 = 5.
		expect(chartPolicy(800, 220, 6).tickTarget).toBe(Math.floor(220 / TICK_SPACING))
	})

	it('caps the target at the density ceiling', () => {
		// A tall plot would target many ticks; density holds it to the cap.
		expect(chartPolicy(800, 900, 4).tickTarget).toBe(4)
	})

	it('floors the target so a short live axis still reads two', () => {
		// A compact-by-height box: floor(height / spacing) could dip toward one, but
		// the axis is drawn, so it never targets fewer than the minimum.
		expect(chartPolicy(800, COMPACT_HEIGHT - 1, CAP).tickTarget).toBeGreaterThanOrEqual(
			MIN_TICK_TARGET,
		)
	})
})

describe('chartPolicy compact format', () => {
	it('compacts the tick labels below the compact width and not above', () => {
		expect(chartPolicy(COMPACT_WIDTH - 1, 300, CAP).compactFormat).toBe(true)

		expect(chartPolicy(COMPACT_WIDTH, 300, CAP).compactFormat).toBe(false)
	})
})

describe('chartPolicy axis titles', () => {
	it('draws titles only past both title bounds', () => {
		expect(chartPolicy(AXIS_TITLE_WIDTH, AXIS_TITLE_HEIGHT, CAP).axisTitles).toBe(true)

		expect(chartPolicy(AXIS_TITLE_WIDTH - 1, AXIS_TITLE_HEIGHT, CAP).axisTitles).toBe(false)

		expect(chartPolicy(AXIS_TITLE_WIDTH, AXIS_TITLE_HEIGHT - 1, CAP).axisTitles).toBe(false)
	})

	it('never draws titles at spark', () => {
		expect(chartPolicy(SPARK_WIDTH - 1, 900, CAP).axisTitles).toBe(false)
	})
})

describe('chartPolicy gridlines', () => {
	it('draws gridlines except at spark', () => {
		expect(chartPolicy(SPARK_WIDTH - 1, 300, CAP).gridLines).toBe(false)

		expect(chartPolicy(COMPACT_WIDTH, 300, CAP).gridLines).toBe(true)
	})
})

describe('chartPolicy legend rows', () => {
	it('caps a stacked band at two rows only in a wide, tall frame', () => {
		expect(chartPolicy(COMPACT_WIDTH, TWO_ROW_LEGEND_HEIGHT, CAP).legendRows).toBe(2)

		expect(chartPolicy(900, 500, CAP).legendRows).toBe(2)
	})

	it('holds one row in a narrow or short frame', () => {
		// Narrow by width (compact) even when tall.
		expect(chartPolicy(COMPACT_WIDTH - 1, 500, CAP).legendRows).toBe(1)

		// Short by height even when wide.
		expect(chartPolicy(900, TWO_ROW_LEGEND_HEIGHT - 1, CAP).legendRows).toBe(1)
	})

	it('drops the legend rows to zero at spark', () => {
		expect(chartPolicy(SPARK_WIDTH - 1, 500, CAP).legendRows).toBe(0)
	})
})
