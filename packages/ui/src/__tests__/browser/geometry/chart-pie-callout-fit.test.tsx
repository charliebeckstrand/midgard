import { renderToString } from 'react-dom/server'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { page } from 'vitest/browser'
import { PieChart } from '../../../modules/chart/pie-chart'
import { allBySlot, attach, getSlot, renderUI, waitFor } from '../../helpers'
import { measureBox } from '../../helpers/geometry/box'
import { HALF_PIXEL, PIXEL } from '../../helpers/geometry/tolerance'
import { hydrate } from '../../helpers/hydrate'
import { installDocsFont } from '../helpers/docs-font'

/**
 * A callout label stays inside the frame. From 480 px wide and up, the frame
 * reserves a 120 px label column on each side from its width alone. The pie
 * places each callout from the rendered width of its text, not from a
 * per-glyph estimate. A name too long for the column is cut, and its share
 * stays whole. A narrower pie draws no callouts, and the legend names its
 * slices whole. The docs font is Google Sans Flex.
 *
 * Rides the real browser because the claim is a computed one: jsdom has no
 * text layout and no container query.
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

/** The box height of a callout pie `width` px wide: the leader band and two columns, or a square. */
function boxHeight(width: number): number {
	return width >= 480 ? Math.max(58, width - 242) : width
}

/** A callout pie in the docs font, at `width`. */
function chart(width: number, data = DATA) {
	return (
		<div style={{ width, fontFamily: '"Google Sans Flex"' }}>
			<PieChart
				aria-label="Traffic by source"
				data={data}
				series={[{ xKey: 'source', yKey: 'visits' }]}
				labels={{ callouts: true }}
				animate={false}
			/>
		</div>
	)
}

/** The plot drawing in `container`, and the box that holds it, once the width lands. */
async function drawing(container: HTMLElement) {
	const svg = await waitFor(() => {
		const found = getSlot(container, 'chart-plot').querySelector('svg')

		if (!found?.parentElement) throw new Error('expected the plot drawing')

		return found
	})

	return { svg, box: svg.parentElement as HTMLElement }
}

/** Renders the pie at `width`, and gives the plot drawing. */
async function pie(width: number, data = DATA) {
	const { container } = renderUI(chart(width, data))

	return { container, ...(await drawing(container)) }
}

/** Renders the pie at `width`, and gives each callout label and the plot drawing. */
const callouts = vi.defineHelper(async (width: number, data = DATA) => {
	const drawn = await pie(width, data)

	const labels = await waitFor(() => {
		const found = allBySlot(drawn.container, 'chart-callout-label')

		expect(found).toHaveLength(data.length)

		return found
	})

	return { labels, ...drawn }
})

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
				const { svg, box } = await pie(width, [...data])

				expect(box).toContainBox(svg)

				expect(box.clientHeight).toBe(Number(svg.getAttribute('height')))
			})
		}
	}

	for (const width of [390, 479]) {
		it(`draws no callouts at ${width}px, and the legend names each slice whole`, async () => {
			const { container, svg } = await pie(width)

			expect(allBySlot(container, 'chart-callout-label')).toHaveLength(0)

			expect(Number(svg.getAttribute('height'))).toBe(width)

			expect(allBySlot(container, 'chart-legend-item').map((item) => item.textContent)).toEqual(
				DATA.map((row) => row.source),
			)
		})
	}

	// No text width enters the box: labels of any length give the same height.
	for (const width of [390, 479, 480, 800]) {
		it(`sizes the box from the width alone at ${width}px`, async () => {
			const long = DATA.map((row) => ({ ...row, source: `${row.source} across every region` }))

			const short = await pie(width)

			expect(short.box.getBoundingClientRect().height).toBeNear(boxHeight(width), HALF_PIXEL)

			const cut = await pie(width, long)

			expect(cut.box.getBoundingClientRect().height).toBeNear(boxHeight(width), HALF_PIXEL)
		})
	}

	// The drawing reads a whole-px width, and the box reads the CSS width. Both
	// take the step at the same width, so the box never clips the drawing.
	for (const width of [479.4, 479.6, 480.4]) {
		it(`takes the step with the drawing at ${width}px`, async () => {
			const { svg, box } = await pie(width)

			expect(box.getBoundingClientRect().height).toBeNear(Number(svg.getAttribute('height')), PIXEL)
		})
	}

	// The server knows no width. The container query of the box takes the step,
	// so the server markup paints the box that the browser keeps.
	for (const width of [390, 800]) {
		it(`paints the hydrated box from the server markup at ${width}px`, async () => {
			const element = chart(width)

			const container = attach(document.createElement('div'))

			container.innerHTML = renderToString(element)

			const plot = getSlot(container, 'chart-plot')

			const served = plot.getBoundingClientRect().height

			expect(served).toBeNear(boxHeight(width), HALF_PIXEL)

			const { onRecoverableError } = hydrate(container, element)

			const { box } = await drawing(container)

			expect(box.getBoundingClientRect().height).toBeNear(served, HALF_PIXEL)

			expect(onRecoverableError).not.toHaveBeenCalled()
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

		// The column is 120 px. The box can paint about 1 px past the advance.
		for (const label of labels)
			expect(measureBox(label).right - measureBox(label).left).toBeLessThanOrEqual(121)
	})
})
