import { describe, expect, it } from 'vitest'
import { LineChart, ScatterChart } from '../../../modules/chart'
import { renderUI } from '../../helpers'
import { eachAuthorScheme, systemColor } from '../helpers/forced-colors'

/**
 * The legend keys of a line chart and a scatter chart under forced colors. Forced colors do not
 * change the stroke of a line or the fill of a disc, so each mark keeps the hue of its series.
 * The key of each mark must keep that hue too, or the reader cannot match a key to its mark: a
 * key in `CanvasText` matches no line. A solid key fills with the hue, a dashed key runs in it,
 * and the key of a disc takes no hatch.
 */

type Quarter = { quarter: string; revenue: number; costs: number }

const rows: Quarter[] = [
	{ quarter: 'Q1', revenue: 40, costs: 24 },
	{ quarter: 'Q2', revenue: 80, costs: 31 },
	{ quarter: 'Q3', revenue: 65, costs: 28 },
]

/** The legend keys under `container`, in the order of the legend. */
function keys(container: HTMLElement): HTMLElement[] {
	return [...container.querySelectorAll<HTMLElement>('[data-slot=swatch]')].filter(
		(key) => key.closest('[aria-hidden=true]') === null,
	)
}

/** The ink of a key: its fill, or the color of its dashed run. */
function ink(key: HTMLElement): string {
	const style = getComputedStyle(key)

	if (key.dataset.variant !== 'dashed') return style.backgroundColor

	return (
		style.backgroundImage.match(/(?:oklch|oklab|rgba?|color)\([^)]*\)/)?.[0] ??
		style.backgroundImage
	)
}

describe('chart legend keys under forced colors (real browser)', () => {
	eachAuthorScheme(() => {
		it('keys each line, a dashed line, and a dashed rule in the hue of its mark', () => {
			const { container } = renderUI(
				<LineChart
					aria-label="Revenue and costs by quarter"
					data={rows}
					series={[
						{ xKey: 'quarter', yKey: 'revenue', yName: 'Revenue' },
						{ xKey: 'quarter', yKey: 'costs', yName: 'Costs', dashed: true },
					]}
					reference={[{ value: 55, label: 'Target', color: 'green', legend: true }]}
					width={360}
				/>,
			)

			const legend = keys(container)

			expect(legend.map((key) => key.dataset.variant)).toEqual(['solid', 'dashed', 'dashed'])

			const inks = legend.map(ink)

			for (const [index, key] of legend.entries()) {
				expect(inks[index]).toBe(getComputedStyle(key).color)

				expect(inks[index]).not.toBe(systemColor('CanvasText'))
			}

			expect(new Set(inks).size).toBe(3)
		})

		it('keys each disc in the hue of its series, with no hatch', () => {
			const { container } = renderUI(
				<ScatterChart
					aria-label="Costs against revenue"
					data={rows}
					series={[
						{ xKey: 'revenue', yKey: 'costs', yName: 'Costs' },
						{ xKey: 'costs', yKey: 'revenue', yName: 'Revenue' },
					]}
					width={360}
				/>,
			)

			const legend = keys(container)

			expect(legend).toHaveLength(2)

			for (const key of legend) {
				const style = getComputedStyle(key)

				expect(style.backgroundColor).toBe(style.color)

				expect(style.backgroundColor).not.toBe(systemColor('CanvasText'))

				expect(key.querySelector('svg')).toBeNull()
			}
		})
	})
})
