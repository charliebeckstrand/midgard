import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { BubbleChart } from '../../modules/chart/bubble-chart'
import { MARKER_RING_WIDTH } from '../../modules/chart/chart-constants'
import { ScatterChart } from '../../modules/chart/scatter-chart'
import { allBySlot, bySlot, renderUI } from '../helpers'

/** How far a disc paints past its center: the radius plus the ring stroked outside it. */
const paintedReach = (mark: { r: number }) => mark.r + MARKER_RING_WIDTH / 2

/**
 * A spark scatter fits its box the way a spark line does: the domain fits tight
 * to the data — no axis to nice-step to, so no band of empty air — and every edge
 * insets by the widest disc's radius, so the marks read centered and clear the
 * frame rather than clipping at it. Disc positions against the drawing box are a
 * computed-layout claim jsdom can't resolve, so this rides the real browser.
 */
describe('spark scatter fits and centers in its box (real browser)', () => {
	beforeAll(() => page.viewport(600, 600))

	// y climbs to 91 and bottoms at 12, x from 1 to 4 — a range a nice-stepped scale
	// would round out to [0, 100], sinking the marks into a low band; tight fitting
	// pins the extremes to the inset edges instead.
	const POINTS = [
		{ x: 1, y: 12 },
		{ x: 2, y: 91 },
		{ x: 3, y: 44 },
		{ x: 4, y: 67 },
	]

	const BUBBLES = [
		{ x: 1, y: 12, w: 10 },
		{ x: 2, y: 91, w: 90 },
		{ x: 3, y: 44, w: 40 },
		{ x: 4, y: 67, w: 70 },
	]

	/**
	 * The drawing box and every disc's center and radius, read off the rendered
	 * SVG. A bubble series draws a circle per disc; a plain series draws one path
	 * of `M cx-r cy a r …` subfigures, so each disc's center reads back as the
	 * move-to x plus the radius.
	 */
	const discs = (container: HTMLElement) => {
		const svg = bySlot(container, 'chart-plot')?.querySelector('svg') as SVGSVGElement

		const box = { width: svg.viewBox.baseVal.width, height: svg.viewBox.baseVal.height }

		const circles = allBySlot(container, 'chart-scatter-point') as unknown as SVGCircleElement[]

		if (circles.length > 0) {
			return {
				box,
				marks: circles.map((circle) => ({
					cx: circle.cx.baseVal.value,
					cy: circle.cy.baseVal.value,
					r: circle.r.baseVal.value,
				})),
			}
		}

		const d = bySlot(container, 'chart-scatter-discs')?.getAttribute('d') ?? ''

		const marks = [...d.matchAll(/M (-?[\d.]+) (-?[\d.]+) a (-?[\d.]+)/g)].map((m) => {
			const r = Number(m[3])

			return { cx: Number(m[1]) + r, cy: Number(m[2]), r }
		})

		return { box, marks }
	}

	it('a spark scatter pins the data extremes to the inset edges and clips nothing', () => {
		const { container } = renderUI(
			<ScatterChart
				aria-label="Spark scatter"
				data={POINTS}
				series={[{ xKey: 'x', yKey: 'y' }]}
				width={150}
				height={96}
			/>,
		)

		expect(bySlot(container, 'chart')).toHaveAttribute('data-tier', 'spark')

		const { box, marks } = discs(container)

		expect(marks.length).toBe(POINTS.length)

		// The inset is the widest disc's painted reach; the plain discs all share it.
		const inset = Math.max(...marks.map(paintedReach))

		const cys = marks.map((mark) => mark.cy)

		const cxs = marks.map((mark) => mark.cx)

		// Tight fit: the top and bottom data points land on the inset lines, so the
		// marks fill the box top to bottom rather than hovering in a band.
		expect(Math.min(...cys)).toBeLessThanOrEqual(inset + 1)

		expect(Math.max(...cys)).toBeGreaterThanOrEqual(box.height - inset - 1)

		expect(Math.min(...cxs)).toBeLessThanOrEqual(inset + 1)

		expect(Math.max(...cxs)).toBeGreaterThanOrEqual(box.width - inset - 1)

		// Nothing clips: every disc, ring and all, sits inside the drawing box.
		for (const mark of marks) {
			expect(mark.cx - paintedReach(mark)).toBeGreaterThanOrEqual(-0.6)

			expect(mark.cx + paintedReach(mark)).toBeLessThanOrEqual(box.width + 0.6)

			expect(mark.cy - paintedReach(mark)).toBeGreaterThanOrEqual(-0.6)

			expect(mark.cy + paintedReach(mark)).toBeLessThanOrEqual(box.height + 0.6)
		}
	})

	it('a spark bubble insets by its largest disc so no bubble clips', () => {
		const { container } = renderUI(
			<BubbleChart
				aria-label="Spark bubble"
				data={BUBBLES}
				series={[{ xKey: 'x', yKey: 'y', sizeKey: 'w' }]}
				width={150}
				height={96}
			/>,
		)

		expect(bySlot(container, 'chart')).toHaveAttribute('data-tier', 'spark')

		const { box, marks } = discs(container)

		expect(marks.length).toBe(BUBBLES.length)

		// Varied radii: the inset is the largest, so even the biggest bubble clears.
		expect(new Set(marks.map((mark) => mark.r)).size).toBeGreaterThan(1)

		for (const mark of marks) {
			expect(mark.cx - paintedReach(mark)).toBeGreaterThanOrEqual(-0.6)

			expect(mark.cx + paintedReach(mark)).toBeLessThanOrEqual(box.width + 0.6)

			expect(mark.cy - paintedReach(mark)).toBeGreaterThanOrEqual(-0.6)

			expect(mark.cy + paintedReach(mark)).toBeLessThanOrEqual(box.height + 0.6)
		}
	})
})
