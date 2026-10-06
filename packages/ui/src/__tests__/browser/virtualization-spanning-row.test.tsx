import { useCallback, useRef, useState } from 'react'
import { describe, expect, it } from 'vitest'
import { useVirtualWindow } from '../../hooks'
import { act, frames, present, renderUI, waitFor } from '../helpers'
import { settledValue } from './helpers/sample'

/**
 * A row of the measured path that spans the top edge, in a real browser. The
 * row grows at its bottom, as a chat reply does while it streams. The part of
 * the row in view must not move. Virtual-core 3.17 skips the scroll adjustment
 * on a later measurement of a spanning row (TanStack/virtual#1218), and the
 * resize rule of the hook must not add it back.
 */
describe('useVirtualWindow spanning row (real browser)', () => {
	type Handle = { grow: (id: number, by: number) => void }

	/** Each row is 200 px. The estimate differs, so each row caches its first measurement. */
	const ROW = 200

	function List({ handle }: { handle: Handle }) {
		const scrollRef = useRef<HTMLDivElement>(null)

		const [extra, setExtra] = useState<Record<number, number>>({})

		handle.grow = (id, by) => setExtra((c) => ({ ...c, [id]: (c[id] ?? 0) + by }))

		const getItemKey = useCallback((index: number) => index, [])

		const { virtualItems, topSpacer, bottomSpacer, measureRef } = useVirtualWindow({
			count: 100,
			getScrollElement: () => scrollRef.current,
			estimateSize: 180,
			overscan: 2,
			getItemKey,
		})

		return (
			<div
				ref={scrollRef}
				data-slot="list"
				style={{ height: 300, overflow: 'auto', overflowAnchor: 'none' }}
			>
				<div style={{ height: topSpacer }} />
				{virtualItems.map((v) => (
					<div
						key={v.key}
						ref={measureRef}
						data-index={v.index}
						data-row={v.index}
						style={{ height: ROW + (extra[v.index] ?? 0), position: 'relative' }}
					>
						<span data-mark={v.index} style={{ position: 'absolute', top: 150 }}>
							mark {v.index}
						</span>
					</div>
				))}
				<div style={{ height: bottomSpacer }} />
			</div>
		)
	}

	it('keeps a spanning row still when it grows at its bottom', async () => {
		const handle: Handle = { grow: () => {} }

		const { container } = renderUI(<List handle={handle} />)

		const scroller = present(container.querySelector<HTMLElement>('[data-slot="list"]'), 'scroller')

		await waitFor(() => expect(scroller.querySelector('[data-row]')).not.toBeNull())

		// Row 10 starts at 1800 by the estimate. Scroll near it, then put the top
		// edge 100 px into the row as it measured.
		scroller.scrollTop = 1900

		await settledValue(() => scroller.scrollTop)

		const row = present(scroller.querySelector<HTMLElement>('[data-row="10"]'), 'row')

		const rowTop = () =>
			row.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop

		scroller.scrollTop = rowTop() + 100

		const top = await settledValue(() => scroller.scrollTop)

		expect(rowTop()).toBeLessThan(top)

		const mark = present(scroller.querySelector<HTMLElement>('[data-mark="10"]'), 'mark')

		const before = mark.getBoundingClientRect().top

		// Each growth is a later measurement of a row that measured already.
		for (let i = 0; i < 3; i++) {
			act(() => handle.grow(10, 100))

			await frames()

			await frames()
		}

		expect({ scrollTop: scroller.scrollTop, markTop: mark.getBoundingClientRect().top }).toEqual({
			scrollTop: top,
			markTop: before,
		})
	})
})
