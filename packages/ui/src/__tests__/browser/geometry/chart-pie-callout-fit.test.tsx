import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { PieChart } from '../../../modules/chart/pie-chart'
import { allBySlot, getSlot, renderUI, waitFor } from '../../helpers'
import { measureBox } from '../../helpers/geometry/box'
import { HALF_PIXEL } from '../../helpers/geometry/tolerance'
import { installDocsFont } from '../helpers/docs-font'

/**
 * A callout label stays inside the frame. The frame reserves a label column on
 * each side from its width alone, and the pie places each callout from the
 * rendered width of its text, not from a per-glyph estimate. A name too long
 * for the column is cut, and its share stays whole. The docs font is Google
 * Sans Flex.
 *
 * Rides the real browser because the claim is a computed one: jsdom has no
 * text layout.
 */
const DATA = [
	{ source: 'Organic search', visits: 4200 },
	{ source: 'Direct', visits: 2600 },
	{ source: 'Referral', visits: 1400 },
	{ source: 'Social media', visits: 900 },
	{ source: 'Email newsletters', visits: 500 },
	{ source: 'Other', visits: 300 },
]

/** One slice takes almost the whole pie, so its callouts crowd the foot. */
const TINY = [
	{ source: 'Organic search', visits: 9999 },
	{ source: 'Direct', visits: 1 },
	{ source: 'Referral', visits: 300 },
]

/** Renders the pie at `width`, and gives each callout label and the plot drawing. */
async function callouts(width: number, data = DATA) {
	const { container } = renderUI(
		<div style={{ width, fontFamily: '"Google Sans Flex"' }}>
			<PieChart
				aria-label="Traffic by source"
				data={data}
				series={[{ xKey: 'source', yKey: 'visits' }]}
				labels={{ callouts: true }}
				animate={false}
			/>
		</div>,
	)

	const labels = await waitFor(() => {
		const found = allBySlot(container, 'chart-callout-label')

		expect(found).toHaveLength(data.length)

		return found
	})

	const svg = getSlot(container, 'chart-plot').querySelector('svg')

	if (!svg?.parentElement) throw new Error('expected the plot drawing')

	return { labels, svg, box: svg.parentElement }
}

describe('pie callout fit (real browser)', () => {
	beforeAll(() => page.viewport(960, 700))

	installDocsFont()

	for (const width of [480, 640, 800]) {
		it(`keeps every callout label inside a ${width}px frame`, async () => {
			const { labels, svg } = await callouts(width)

			const frame = measureBox(svg)

			// The check reads the horizontal edges only.
			for (const label of labels) {
				expect(svg).toContainBox({ ...measureBox(label), top: frame.top, bottom: frame.bottom })
			}
		})
	}

	// The plot box clips its drawing, so the drawing takes the height that the box
	// reserves.
	for (const [name, data] of [
		['six slices', DATA],
		['one dominant slice', TINY],
	] as const) {
		for (const width of [390, 800]) {
			it(`fits the plot box to the drawing of ${name} at ${width}px`, async () => {
				const { svg, box } = await callouts(width, [...data])

				expect(box).toContainBox(svg)

				expect(box.clientHeight).toBe(Number(svg.getAttribute('height')))
			})
		}
	}

	// No text width enters the box: labels of any length give the same height,
	// the CSS reserve of the leader band and a min(25%, 120 px) column per side.
	for (const width of [390, 800]) {
		it(`sizes the box from the width alone at ${width}px`, async () => {
			const long = DATA.map((row) => ({ ...row, source: `${row.source} across every region` }))

			const short = await callouts(width)

			const expected = Math.max(58, width + 58 - 60 - 2 * Math.min(0.25 * width, 120))

			expect(short.box.getBoundingClientRect().height).toBeNear(expected, HALF_PIXEL)

			const cut = await callouts(width, long)

			expect(cut.box.getBoundingClientRect().height).toBeNear(expected, HALF_PIXEL)
		})
	}

	it('cuts a long name to the column and keeps its share whole', async () => {
		const width = 480

		const { labels } = await callouts(width, [
			{ source: 'Organic search across every partner network', visits: 4200 },
			{ source: 'Direct', visits: 2600 },
		])

		const [long, direct] = labels

		expect(long?.textContent).toMatch(/^Organic.*… 62%$/)

		expect(direct?.textContent).toBe('Direct 38%')

		// The column is min(25% of 480, 120) = 120 px. The box can paint about 1 px
		// past the advance.
		for (const label of labels)
			expect(measureBox(label).right - measureBox(label).left).toBeLessThanOrEqual(121)
	})
})
