import { describe, expect, it } from 'vitest'
import { PieChart } from '../../../modules/chart'
import { renderUI } from '../../helpers'
import { eachAuthorScheme, systemColor } from '../helpers/forced-colors'

/**
 * The labels inside the slices of a pie under forced colors. A label fills in white on the fill
 * of its slice. Forced colors replace that fill with a tile on `Canvas`, and do not change the
 * fill of SVG text, so a white label disappears on a light `Canvas`. Each label must fill in
 * `CanvasText`, with a halo in `Canvas` that parts it from the lines of the tile.
 */
describe('pie segment labels under forced colors (real browser)', () => {
	eachAuthorScheme(() => {
		it('fills each label in CanvasText over a Canvas halo', () => {
			const { container } = renderUI(
				<PieChart
					aria-label="Revenue share by quarter"
					data={[
						{ quarter: 'Q1', revenue: 40 },
						{ quarter: 'Q2', revenue: 80 },
						{ quarter: 'Q3', revenue: 65 },
					]}
					series={[{ xKey: 'quarter', yKey: 'revenue' }]}
					labels={{ segment: true }}
					width={280}
					height={200}
				/>,
			)

			const labels = [
				...container.querySelectorAll<SVGTextElement>('[data-slot=chart-segment-label]'),
			]

			expect(labels).toHaveLength(3)

			for (const label of labels) {
				const style = getComputedStyle(label)

				expect(`${style.fill} ${style.stroke}`).toBe(
					`${systemColor('CanvasText')} ${systemColor('Canvas')}`,
				)

				expect(Number.parseFloat(style.strokeWidth)).toBeGreaterThan(0)
			}
		})
	})
})
