import { useMemo, useRef } from 'react'
import { describe, expect, it } from 'vitest'
import { NO_WINDOW_SNAPSHOT, useGridItemWindow } from '../../modules/grid/use-grid-item-window'
import { frames, present, renderUI, waitFor } from '../helpers'

/**
 * The measured window that the grouped and master-detail bodies share, in a
 * real browser. It must count the table head above the first row, and the
 * sticky part of that head. Nothing in those bodies calls `scrollToIndex`
 * while the cursor stands down, so a harness drives it here.
 */
describe('useGridItemWindow (real browser)', () => {
	type Handle = {
		scrollToIndex: (index: number, options?: { align?: 'start' | 'end' }) => void
	}

	/** A row height that differs from the estimate, as a wrapped row does. */
	const heightOf = (index: number) => 30 + ((index * 37) % 90)

	function Harness({ handle }: { handle: Handle }) {
		const scrollRef = useRef<HTMLDivElement>(null)

		const snapshot = useRef(NO_WINDOW_SNAPSHOT)

		const items = useMemo(
			() => Array.from({ length: 300 }, (_, i) => ({ key: `leaf:${i}`, kind: 'leaf' })),
			[],
		)

		const win = useGridItemWindow(
			items,
			{
				scrollRef,
				estimateSize: 44,
				overscan: 4,
				fitRenderedRows: () => {},
				stickyHeader: true,
			},
			snapshot,
		)

		handle.scrollToIndex = win.scrollToIndex

		return (
			<div ref={scrollRef} data-slot="grid-scroll" style={{ height: 400, overflow: 'auto' }}>
				<table style={{ width: 300, borderCollapse: 'collapse' }}>
					<thead>
						<tr>
							<th style={{ position: 'sticky', top: 0, height: 40, background: 'white' }}>Head</th>
						</tr>
					</thead>
					<tbody ref={win.bodyRef}>
						{win.topSpacer > 0 && (
							<tr>
								<td style={{ height: win.topSpacer, padding: 0 }} />
							</tr>
						)}
						{win.virtualItems.map((item) => (
							<tr key={item.key} ref={win.measureRef} data-index={item.index}>
								<td style={{ height: heightOf(item.index), padding: 0 }}>{item.index}</td>
							</tr>
						))}
						{win.bottomSpacer > 0 && (
							<tr>
								<td style={{ height: win.bottomSpacer, padding: 0 }} />
							</tr>
						)}
					</tbody>
				</table>
			</div>
		)
	}

	it('lands a scrollToIndex row below the sticky head and above the bottom edge', async () => {
		const handle: Handle = { scrollToIndex: () => {} }

		const { container } = renderUI(<Harness handle={handle} />)

		const scroll = present(
			container.querySelector<HTMLElement>('[data-slot="grid-scroll"]'),
			'scroller',
		)

		const head = present(scroll.querySelector('th'), 'the head cell')

		const row = (index: number) => scroll.querySelector<HTMLElement>(`tr[data-index="${index}"]`)

		await waitFor(() => expect(row(0)).not.toBeNull())

		for (const index of [200, 80, 250, 10]) {
			handle.scrollToIndex(index, { align: 'start' })

			await waitFor(() =>
				expect(
					Math.abs(
						present(row(index), `row ${index}`).getBoundingClientRect().top -
							head.getBoundingClientRect().bottom,
					),
				).toBeLessThanOrEqual(1),
			)
		}

		handle.scrollToIndex(150, { align: 'end' })

		const bottom = scroll.getBoundingClientRect().top + scroll.clientHeight

		await waitFor(() =>
			expect(
				Math.abs(present(row(150), 'row 150').getBoundingClientRect().bottom - bottom),
			).toBeLessThanOrEqual(1),
		)

		// The alignment holds once the scroll settles.
		await frames()

		expect(
			Math.abs(present(row(150), 'row 150').getBoundingClientRect().bottom - bottom),
		).toBeLessThanOrEqual(1)
	})
})
