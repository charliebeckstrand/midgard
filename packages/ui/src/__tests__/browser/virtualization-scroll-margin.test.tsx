import { useRef } from 'react'
import { describe, expect, it } from 'vitest'
import { useVirtualWindow } from '../../hooks'
import { frames, present, renderUI, waitFor } from '../helpers'

/**
 * A window below content that sits above its first row, in a real browser.
 * The harness has the shape of the grid: a sticky head, a block that does not
 * stick, and a windowed body. `scrollMargin` counts both above the first row,
 * and `scrollPaddingStart` counts the sticky head, which covers the top edge.
 */

const HEAD = 40

const BLOCK = 30

const ROW = 44

const VIEWPORT = 300

type Handle = {
	scrollToIndex: (index: number, options: { align: 'auto' | 'center' | 'end' | 'start' }) => void
}

function HeadedTable({ handle }: { handle: Handle }) {
	const scrollRef = useRef<HTMLDivElement>(null)

	const { virtualItems, topSpacer, bottomSpacer, scrollToIndex } = useVirtualWindow({
		count: 500,
		getScrollElement: () => scrollRef.current,
		estimateSize: ROW,
		overscan: 2,
		scrollMargin: HEAD + BLOCK,
		scrollPaddingStart: HEAD,
	})

	handle.scrollToIndex = scrollToIndex

	return (
		<div ref={scrollRef} data-slot="headed-scroll" style={{ height: VIEWPORT, overflow: 'auto' }}>
			<table style={{ borderCollapse: 'collapse', width: '100%' }}>
				<thead>
					<tr>
						<th
							style={{
								position: 'sticky',
								top: 0,
								height: HEAD,
								padding: 0,
								background: 'white',
								zIndex: 1,
							}}
						>
							Head
						</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td style={{ height: BLOCK, padding: 0 }}>Block</td>
					</tr>
				</tbody>
				<tbody data-slot="headed-body">
					{topSpacer > 0 && (
						<tr data-slot="spacer">
							<td style={{ height: topSpacer, padding: 0 }} />
						</tr>
					)}
					{virtualItems.map((item) => (
						<tr key={item.key} data-index={item.index} data-start={item.start}>
							<td style={{ height: ROW, padding: 0 }}>Row {item.index}</td>
						</tr>
					))}
					{bottomSpacer > 0 && (
						<tr data-slot="spacer">
							<td style={{ height: bottomSpacer, padding: 0 }} />
						</tr>
					)}
				</tbody>
			</table>
		</div>
	)
}

describe('useVirtualWindow with content above the first row', () => {
	function setup() {
		const handle: Handle = { scrollToIndex: () => {} }

		const view = renderUI(<HeadedTable handle={handle} />)

		const scroller = present(
			view.container.querySelector<HTMLElement>('[data-slot="headed-scroll"]'),
			'[data-slot="headed-scroll"]',
		)

		/** The box of the scroller that the sticky head does not cover. */
		const clear = () => {
			const box = scroller.getBoundingClientRect()

			return { top: box.top + HEAD, bottom: box.top + scroller.clientHeight }
		}

		const row = (index: number) =>
			present(
				scroller.querySelector<HTMLElement>(`tr[data-index="${index}"]`),
				`row ${index}`,
			).getBoundingClientRect()

		return { handle, scroller, clear, row }
	}

	it('places each row at the start the window gives it, below the content above', async () => {
		const { scroller } = setup()

		scroller.scrollTop = 4000

		await waitFor(() => {
			const origin = scroller.getBoundingClientRect().top - scroller.scrollTop

			const rows = Array.from(scroller.querySelectorAll<HTMLElement>('tr[data-index]'))

			expect(rows.length).toBeGreaterThan(0)

			for (const tr of rows) {
				expect(Math.round(tr.getBoundingClientRect().top - origin)).toBe(Number(tr.dataset.start))
			}
		})
	})

	for (const align of ['start', 'center', 'end'] as const) {
		it(`lands a row in full view below the sticky head with align '${align}'`, async () => {
			const { handle, clear, row } = setup()

			await waitFor(() => row(0))

			for (const index of [200, 40, 300]) {
				handle.scrollToIndex(index, { align })

				await waitFor(() => row(index))

				await frames()

				const box = row(index)

				expect(box.top).toBeGreaterThanOrEqual(clear().top - 1)

				expect(box.bottom).toBeLessThanOrEqual(clear().bottom + 1)

				if (align === 'start') expect(box.top).toBeCloseTo(clear().top, 0)

				if (align === 'end') expect(box.bottom).toBeCloseTo(clear().bottom, 0)

				// The library centers the row on the viewport, and then moves it down
				// by the start padding. The row thus stays clear of the sticky head.
				if (align === 'center') {
					const middle = clear().top + VIEWPORT / 2

					expect((box.top + box.bottom) / 2).toBeCloseTo(middle, 0)
				}
			}
		})
	}

	it("lands a row in full view below the sticky head with align 'auto', down and up", async () => {
		const { handle, clear, row } = setup()

		await waitFor(() => row(0))

		for (const index of [30, 5]) {
			handle.scrollToIndex(index, { align: 'auto' })

			await waitFor(() => row(index))

			await frames()

			const box = row(index)

			expect(box.top).toBeGreaterThanOrEqual(clear().top - 1)

			expect(box.bottom).toBeLessThanOrEqual(clear().bottom + 1)
		}
	})
})
