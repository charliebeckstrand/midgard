import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { BarChart } from '../../modules/chart/bar-chart'
import { GUTTER_MAX } from '../../modules/chart/engine/chart-constants'
import { getSlot, renderUI, waitFor } from '../helpers'

/**
 * A horizontal bar chart's category label stays inside the frame. The left
 * gutter holds the rendered width of each label, and a label wider than the
 * room is cut with an ellipsis. The docs font is Google Sans Flex. In it,
 * "Organic search" and "Email newsletters" are wider than the 96 px gutter cap,
 * and the old per-glyph estimate clipped them at the frame edge.
 *
 * The browser project shares one page across files, so the font loads as a
 * `FontFace` that this file removes again, and only the chart host sets it.
 *
 * Rides the real browser because the claim is a computed one: jsdom has no
 * text layout.
 */
const DOCS_FONT_URL = new URL(
	'../../docs/engine/fonts/GoogleSansFlex-VariableFont_opsz,wght.woff2',
	import.meta.url,
).href

const DOCS_FONT = new FontFace('Google Sans Flex', `url("${DOCS_FONT_URL}")`, {
	weight: '100 1000',
})

const DATA = [
	{ source: 'Organic search', visits: 4200 },
	{ source: 'Direct', visits: 2600 },
	{ source: 'Referral', visits: 1400 },
	{ source: 'Email newsletters', visits: 500 },
]

/** Each category label as it draws, its overflow past the left edge of the drawing in px, and the gutter. */
async function bandLabels(width: number) {
	const { container } = renderUI(
		<div style={{ width, fontFamily: '"Google Sans Flex"' }}>
			<BarChart
				aria-label="Visits by source"
				data={DATA}
				series={[{ xKey: 'source', yKey: 'visits' }]}
				orientation="horizontal"
				animate={false}
			/>
		</div>,
	)

	const texts = await waitFor(() => {
		const found = [...getSlot(container, 'chart-axis-y').querySelectorAll('text')]

		expect(found).toHaveLength(DATA.length)

		return found
	})

	const svg = getSlot(container, 'chart-plot').querySelector('svg')

	if (!svg) throw new Error('expected the plot drawing')

	const frame = svg.getBoundingClientRect()

	return texts.map((text) => ({
		text: text.textContent,
		overflow: Math.max(0, frame.left - text.getBoundingClientRect().left),
		// The label ends GUTTER_GAP before the plot, so its anchor bounds the gutter.
		anchor: Number(text.getAttribute('x')),
	}))
}

describe('horizontal band labels (real browser)', () => {
	beforeAll(() => page.viewport(960, 700))

	beforeAll(async () => {
		document.fonts.add(await DOCS_FONT.load())
	})

	afterAll(() => {
		document.fonts.delete(DOCS_FONT)
	})

	for (const width of [480, 640, 960]) {
		it(`keeps every category label inside a ${width}px frame`, async () => {
			const labels = await bandLabels(width)

			expect(labels.map((label) => label.overflow)).toEqual(DATA.map(() => 0))

			// Only the labels past the room are cut.
			expect(labels.map((label) => label.text)).toEqual([
				expect.stringMatching(/^Organic.*…$/),
				'Direct',
				'Referral',
				expect.stringMatching(/^Email.*…$/),
			])

			for (const label of labels) expect(label.anchor).toBeLessThan(GUTTER_MAX)
		})
	}
})
