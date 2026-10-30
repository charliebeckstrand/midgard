import { describe, expect, it, vi } from 'vitest'
import { pieCalloutFit } from '../../modules/chart/engine/chart-geometry/pie'
import { PieChart } from '../../modules/chart/pie-chart'
import { SectorChartMarks } from '../../modules/chart/sector-chart/sector-chart-marks'
import { act, allBySlot, fireEvent, renderUI } from '../helpers'

/**
 * A callout pie fits its disc to the frame once in a render, and each callout
 * text formats once. The readout formats each share once, however many renders
 * read it. A hidden slice changes the fit, and does not add one.
 *
 * The fit count reads `pieCalloutFit`, the format count reads the percent
 * formatter, and the render count reads the slice layer, which the chart body
 * draws on each of its renders. The counts need module mocks, so this suite
 * sits in `boundary/`.
 */
/** Takes each share that a percent formatter formats. */
const shareFormats = vi.hoisted(() => vi.fn<(share: number) => void>())

vi.mock('../../utilities', async (importActual) => {
	const actual = await importActual<typeof import('../../utilities')>()

	return {
		...actual,
		percentFormat: (locale?: string) => {
			const format = actual.percentFormat(locale)

			return (share: number) => {
				shareFormats(share)

				return format(share)
			}
		},
	}
})

vi.mock('../../modules/chart/engine/chart-geometry/pie', async (importOriginal) => {
	const actual =
		await importOriginal<typeof import('../../modules/chart/engine/chart-geometry/pie')>()

	return { ...actual, pieCalloutFit: vi.fn(actual.pieCalloutFit) }
})

vi.mock('../../modules/chart/sector-chart/sector-chart-marks', async (importOriginal) => {
	const actual =
		await importOriginal<typeof import('../../modules/chart/sector-chart/sector-chart-marks')>()

	return { ...actual, SectorChartMarks: vi.fn(actual.SectorChartMarks) }
})

const fits = () => vi.mocked(pieCalloutFit).mock.calls.length

const formats = () => shareFormats.mock.calls.length

const renders = () => vi.mocked(SectorChartMarks).mock.calls.length

const DATA = [
	{ source: 'Search', visits: 60 },
	{ source: 'Direct', visits: 25 },
	{ source: 'Referral', visits: 15 },
]

describe('pie callout fit', () => {
	it('fits the pie once and formats each callout text once in a render', () => {
		// No legend, so each percent format is a callout text or a readout cell.
		renderUI(
			<PieChart
				aria-label="Traffic by source"
				data={DATA}
				series={[{ xKey: 'source', yKey: 'visits' }]}
				labels={{ callouts: true }}
				legend={false}
				width={600}
			/>,
		)

		expect(renders()).toBeGreaterThan(0)

		expect(fits()).toBe(renders())

		// The readout formats each share once more, the first time the table reads it.
		expect(formats()).toBe((renders() + 1) * DATA.length)
	})

	it('fits only the visible slices while a slice is hidden', () => {
		const { container } = renderUI(
			<PieChart
				aria-label="Traffic by source"
				data={DATA}
				series={[{ xKey: 'source', yKey: 'visits' }]}
				labels={{ callouts: true }}
				width={600}
			/>,
		)

		const [first] = allBySlot(container, 'chart-legend-item')

		vi.mocked(pieCalloutFit).mockClear()

		vi.mocked(SectorChartMarks).mockClear()

		act(() => fireEvent.click(first as Element))

		expect(renders()).toBeGreaterThan(0)

		// The frame sizes from the width alone, so only the visible slices take a fit.
		expect(fits()).toBe(renders())
	})
})
