import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { GUTTER_MAX } from '../../../modules/chart/engine/chart-constants'
import { HeatmapChart, type HeatmapChartSeries } from '../../../modules/chart/heatmap-chart'
import { allBySlot, getSlot, renderUI, waitFor } from '../../helpers'
import { boxOf } from '../../helpers/geometry/box'
import { installDocsFont } from '../helpers/docs-font'

/**
 * A heatmap row label stays inside the frame. The gutter holds the rendered
 * width of each label, and a label wider than the room is cut with an ellipsis.
 * The docs font is Google Sans Flex. In it, "Organic search" is wider than the
 * 96 px gutter cap, and the old per-glyph estimate clipped it by 16 px.
 *
 * Rides the real browser because the claim is a computed one: jsdom has no
 * text layout.
 */
const SOURCES = ['Organic search', 'Direct', 'Referral', 'Social']

const DATA = SOURCES.flatMap((source, row) =>
	['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, col) => ({ source, day, visits: row * 5 + col })),
)

const SERIES: [HeatmapChartSeries<(typeof DATA)[number]>] = [
	{ xKey: 'day', yKey: 'source', colorKey: 'visits', colorRange: ['#e0f2fe', '#0369a1'] },
]

/** Each row label as it draws, the box of the drawing, and the offset of the plot in it. */
async function rowLabels(width: number) {
	const { container } = renderUI(
		<div style={{ width, fontFamily: '"Google Sans Flex"' }}>
			<HeatmapChart aria-label="Visits by source" data={DATA} series={SERIES} />
		</div>,
	)

	const texts = await waitFor(() => {
		const found = [...getSlot(container, 'chart-axis-y').querySelectorAll('text')]

		expect(found).toHaveLength(SOURCES.length)

		return found
	})

	const svg = getSlot(container, 'chart-plot').querySelector('svg')

	if (!svg) throw new Error('expected the plot drawing')

	const frame = svg.getBoundingClientRect()

	const [plot] = allBySlot(container, 'chart-hit')

	return {
		frame: boxOf(svg),
		plotLeft: (plot?.getBoundingClientRect().left ?? frame.left) - frame.left,
		labels: texts.map((text) => ({ text: text.textContent, left: boxOf(text).left })),
	}
}

describe('heatmap row labels (real browser)', () => {
	beforeAll(() => page.viewport(960, 700))

	installDocsFont()

	for (const width of [360, 640, 960]) {
		it(`keeps every row label inside a ${width}px frame`, async () => {
			const { frame, labels } = await rowLabels(width)

			// The check reads the left edge only.
			for (const label of labels) expect(frame).toContainBox({ ...frame, left: label.left })

			// Only the label past the room is cut.
			expect(labels.map((label) => label.text)).toEqual([
				expect.stringMatching(/^Organic.*…$/),
				'Direct',
				'Referral',
				'Social',
			])
		})
	}

	it('holds the gutter at the cap for a cut label', async () => {
		const { plotLeft } = await rowLabels(640)

		expect(plotLeft).toBeLessThanOrEqual(GUTTER_MAX)
	})
})
