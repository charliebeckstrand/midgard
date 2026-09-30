import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { PieChart } from '../../../modules/chart/pie-chart'
import { allBySlot, getSlot, renderUI, waitFor } from '../../helpers'

/**
 * A callout label stays inside the frame. The pie reserves the room of each
 * callout from the rendered width of its text, and not from a per-glyph
 * estimate. The docs font is Google Sans Flex, in which these names measure
 * about 7.8 px for each character. The old 6 px estimate clipped the widest
 * label on each side by up to 32 px.
 *
 * The browser project shares one page across files, so the font loads as a
 * `FontFace` that this file removes again, and only the chart host sets it.
 *
 * Rides the real browser because the claim is a computed one: jsdom has no
 * text layout.
 */
const DOCS_FONT_URL = new URL(
	'../../../docs/engine/fonts/GoogleSansFlex-VariableFont_opsz,wght.woff2',
	import.meta.url,
).href

const DOCS_FONT = new FontFace('Google Sans Flex', `url("${DOCS_FONT_URL}")`, {
	weight: '100 1000',
})

const DATA = [
	{ source: 'Organic search', visits: 4200 },
	{ source: 'Direct', visits: 2600 },
	{ source: 'Referral', visits: 1400 },
	{ source: 'Social media', visits: 900 },
	{ source: 'Email newsletters', visits: 500 },
	{ source: 'Other', visits: 300 },
]

/** The horizontal overflow of each callout label past the drawing, in px; 0 for a label inside it. */
async function calloutOverflow(width: number): Promise<number[]> {
	const { container } = renderUI(
		<div style={{ width, fontFamily: '"Google Sans Flex"' }}>
			<PieChart
				aria-label="Traffic by source"
				data={DATA}
				series={[{ xKey: 'source', yKey: 'visits' }]}
				labels={{ callouts: true }}
				animate={false}
			/>
		</div>,
	)

	const labels = await waitFor(() => {
		const found = allBySlot(container, 'chart-callout-label')

		expect(found).toHaveLength(DATA.length)

		return found
	})

	const svg = getSlot(container, 'chart-plot').querySelector('svg')

	if (!svg) throw new Error('expected the plot drawing')

	const frame = svg.getBoundingClientRect()

	return labels.map((label) => {
		const box = label.getBoundingClientRect()

		return Math.max(0, frame.left - box.left, box.right - frame.right)
	})
}

describe('pie callout fit (real browser)', () => {
	beforeAll(() => page.viewport(960, 700))

	beforeAll(async () => {
		document.fonts.add(await DOCS_FONT.load())
	})

	afterAll(() => {
		document.fonts.delete(DOCS_FONT)
	})

	for (const width of [480, 640, 800]) {
		it(`keeps every callout label inside a ${width}px frame`, async () => {
			const overflow = await calloutOverflow(width)

			expect(overflow).toEqual(DATA.map(() => 0))
		})
	}
})
