import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { PieChart } from '../../../modules/chart/pie-chart'
import { allBySlot, getSlot, renderUI, waitFor } from '../../helpers'
import { measureBox } from '../../helpers/geometry/box'
import { installDocsFont } from '../helpers/docs-font'

/**
 * A callout label stays inside the frame. The pie reserves the room of each
 * callout from the rendered width of its text, and not from a per-glyph
 * estimate. The docs font is Google Sans Flex, in which these names measure
 * about 7.8 px for each character. The old 6 px estimate clipped the widest
 * label on each side by up to 32 px.
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

	// The plot box clips its drawing. The tight callout fit draws a pie taller
	// than the flat margin that the box reserves from its width, so the box takes
	// the drawn height once the width is known.
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
})
