import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { PieChart } from '../../modules/chart/pie-chart'
import { allBySlot, bySlot, renderUI, waitFor } from '../helpers'

/**
 * The side-panel legend reserves a fixed-width column (`sm:w-64`) so its content
 * never scales the plot, centers the left-aligned entry block within that column,
 * and clips an over-long label to one line — arming a reveal tooltip through the
 * shared {@link useTruncation} overflow detector the grid's cells use. Every claim
 * here is a computed-layout one — reserved width, centered block, sub-pixel clip —
 * that jsdom, with no layout engine, can't measure, so it rides the real browser.
 */
describe('chart legend panel (real browser)', () => {
	// The panel column and its centering are `sm:`-gated (≥640px); widen the test
	// iframe past that breakpoint so the side-by-side layout — not the mobile stack —
	// is what these assertions measure.
	beforeAll(() => page.viewport(960, 640))

	it('reserves a fixed-width column and centers the left-aligned block', async () => {
		const { container } = renderUI(
			<PieChart
				aria-label="Traffic by source"
				data={[
					{ source: 'A', visits: 50 },
					{ source: 'B', visits: 30 },
					{ source: 'C', visits: 20 },
				]}
				series={[{ xKey: 'source', yKey: 'visits' }]}
				width={640}
				height={320}
				legend="right"
			/>,
		)

		const panel = bySlot(container, 'chart-legend') as HTMLElement
		const block = bySlot(container, 'chart-legend-items') as HTMLElement

		// The column is the static 16rem (`sm:w-64`), not a percentage of the 640px
		// chart — a half-width panel would be ~320px.
		await waitFor(() => expect(panel.getBoundingClientRect().width).toBeGreaterThan(250))

		const panelRect = panel.getBoundingClientRect()

		expect(panelRect.width).toBeLessThan(264)

		const blockRect = block.getBoundingClientRect()

		// Short labels leave the block narrower than the reserved column, and the
		// column centers it — equal gaps on either side rather than pinned to the plot.
		expect(blockRect.width).toBeLessThan(panelRect.width)

		const leftGap = blockRect.left - panelRect.left
		const rightGap = panelRect.right - blockRect.right

		expect(leftGap).toBeGreaterThan(1)
		expect(Math.abs(leftGap - rightGap)).toBeLessThan(2)

		// The entries still share one left edge — the block's — so their swatches line
		// up rather than each row centering on its own.
		for (const item of allBySlot(container, 'chart-legend-item') as HTMLElement[]) {
			expect(Math.abs(item.getBoundingClientRect().left - blockRect.left)).toBeLessThan(1)
		}
	})

	it('clips an over-long label and arms its reveal tooltip while a short one stays bare', async () => {
		const { container } = renderUI(
			<PieChart
				aria-label="Traffic by source"
				data={[
					{ source: 'A carrier name far too long to fit the reserved legend column', visits: 60 },
					{ source: 'XPO', visits: 40 },
				]}
				series={[{ xKey: 'source', yKey: 'visits' }]}
				width={640}
				height={320}
				legend="right"
			/>,
		)

		// The whole entry (button) is the tooltip trigger — the label span it wraps
		// carries the clip, and the trigger gains `cursor-help` once truncated.
		const entries = allBySlot(container, 'chart-legend-item') as HTMLElement[]
		const clip = (entry: HTMLElement) => entry.querySelector('.truncate') as HTMLElement

		await waitFor(() => {
			const long = clip(entries[0] as HTMLElement)

			expect(long.scrollWidth).toBeGreaterThan(long.clientWidth)
		})

		const long = entries[0] as HTMLElement
		const short = entries[1] as HTMLElement

		// The clipped entry arms the tooltip (cursor-help rides `enabled`, gated by
		// the shared truncation detector)...
		expect(long.className).toContain('cursor-help')

		// ...while the entry that fits neither clips nor arms.
		expect(clip(short).scrollWidth).toBeLessThanOrEqual(clip(short).clientWidth)

		expect(short.className).not.toContain('cursor-help')
	})
})
