import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PieChart } from '../../modules/chart/pie-chart'
import { act, allBySlot, fireEvent, renderUI } from '../helpers'

/**
 * A callout pie fits its disc to the frame once in a render. The frame sizing,
 * the callout gate, and the drawing read that one fit, and each callout text
 * formats once. A hidden slice gives the visible slices a fit of their own.
 *
 * The fit count reads `pieCalloutFit`, the format count reads the percent
 * formatter, and the render count reads the slice layer, which the chart body
 * draws on each of its renders. The counts need module mocks, so this suite
 * sits in `boundary/`.
 */
const counts = vi.hoisted(() => ({ fits: 0, formats: 0, renders: 0 }))

vi.mock('../../utilities', async (importActual) => {
	const actual = await importActual<typeof import('../../utilities')>()

	return {
		...actual,
		percentFormat: (locale?: string) => {
			const format = actual.percentFormat(locale)

			return (share: number) => {
				counts.formats += 1

				return format(share)
			}
		},
	}
})

vi.mock('../../modules/chart/engine/chart-geometry/pie', async (importOriginal) => {
	const actual =
		await importOriginal<typeof import('../../modules/chart/engine/chart-geometry/pie')>()

	return {
		...actual,
		pieCalloutFit: (...args: Parameters<typeof actual.pieCalloutFit>) => {
			counts.fits += 1

			return actual.pieCalloutFit(...args)
		},
	}
})

vi.mock('../../modules/chart/sector-chart/sector-chart-marks', async (importOriginal) => {
	const actual =
		await importOriginal<typeof import('../../modules/chart/sector-chart/sector-chart-marks')>()

	return {
		...actual,
		SectorChartMarks: (props: Parameters<typeof actual.SectorChartMarks>[0]) => {
			counts.renders += 1

			return actual.SectorChartMarks(props)
		},
	}
})

const DATA = [
	{ source: 'Search', visits: 60 },
	{ source: 'Direct', visits: 25 },
	{ source: 'Referral', visits: 15 },
]

beforeEach(() => {
	counts.fits = 0

	counts.formats = 0

	counts.renders = 0
})

describe('pie callout fit', () => {
	it('fits the pie once and formats each callout text once in a render', () => {
		// No legend, so each percent format is a callout text. No height, so the
		// frame sizes from the callout fit too.
		renderUI(
			<PieChart
				aria-label="Traffic by source"
				data={DATA}
				series={[{ xKey: 'source', yKey: 'visits' }]}
				labels={{ callouts: true }}
				legend={false}
				width={300}
			/>,
		)

		expect(counts.renders).toBeGreaterThan(0)

		expect(counts.fits).toBe(counts.renders)

		expect(counts.formats).toBe(counts.renders * DATA.length)
	})

	it('fits the visible slices once more while a slice is hidden', () => {
		const { container } = renderUI(
			<PieChart
				aria-label="Traffic by source"
				data={DATA}
				series={[{ xKey: 'source', yKey: 'visits' }]}
				labels={{ callouts: true }}
				width={300}
			/>,
		)

		const [first] = allBySlot(container, 'chart-legend-item')

		counts.fits = 0

		counts.renders = 0

		act(() => fireEvent.click(first as Element))

		expect(counts.renders).toBeGreaterThan(0)

		// The frame sizes from the whole dataset, and the pie fits the visible slices.
		expect(counts.fits).toBe(counts.renders * 2)
	})
})
