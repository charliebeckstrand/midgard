import { _resetIOSDetectionForTests, Virtualizer } from '@tanstack/virtual-core'
import { useCallback, useRef, useState } from 'react'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { useVirtualWindow } from '../../hooks'
import { act, frames, getSlot, renderUI, waitFor } from '../helpers'
import { settledValue } from './helpers/sample'

/**
 * A correction that virtual-core holds while a touch on iOS controls the
 * scroller, in a real browser. The held move is part of the offset, and the
 * rows render shifted back by it, so the scroller is shorter than the layout
 * by the hold. The hook clamps each correction to the offsets that the
 * scroller can reach. The bound of that clamp must include the hold.
 */
describe('useVirtualWindow held correction on iOS (real browser)', () => {
	type Handle = { grow: (id: number, by: number) => void }

	const COUNT = 30

	const ROW = 200

	const IOS_USER_AGENT =
		'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1'

	function List({ handle }: { handle: Handle }) {
		const scrollRef = useRef<HTMLDivElement>(null)

		const [extra, setExtra] = useState<Record<number, number>>({})

		handle.grow = (id, by) => setExtra((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + by }))

		const getItemKey = useCallback((index: number) => index, [])

		const { virtualItems, topSpacer, bottomSpacer, measureRef } = useVirtualWindow({
			count: COUNT,
			getScrollElement: () => scrollRef.current,
			estimateSize: ROW,
			overscan: 2,
			getItemKey,
			anchorTo: 'end',
		})

		return (
			<div
				ref={scrollRef}
				data-slot="list"
				style={{ height: 300, overflow: 'auto', overflowAnchor: 'none' }}
			>
				<div style={{ height: topSpacer }} />
				{virtualItems.map((item) => (
					<div
						key={item.key}
						ref={measureRef}
						data-index={item.index}
						style={{ height: ROW + (extra[item.index] ?? 0) }}
					/>
				))}
				<div style={{ height: bottomSpacer }} />
			</div>
		)
	}

	it('moves toward the end for each growth of the last row while the touch holds', async () => {
		vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(IOS_USER_AGENT)

		_resetIOSDetectionForTests()

		onTestFinished(_resetIOSDetectionForTests)

		const corrections = vi.spyOn(
			Virtualizer.prototype as unknown as { applyScrollAdjustment: (delta: number) => boolean },
			'applyScrollAdjustment',
		)

		const handle: Handle = { grow: () => {} }

		const { container } = renderUI(<List handle={handle} />)

		const scroller = getSlot(container, 'list')

		await waitFor(() => expect(scroller.querySelector('[data-index]')).not.toBeNull())

		scroller.scrollTop = scroller.scrollHeight

		await settledValue(() => scroller.scrollTop)

		corrections.mockClear()

		scroller.dispatchEvent(new TouchEvent('touchstart', { bubbles: true }))

		// Each growth at the end moves the end down by 100 px. The first move is
		// held, so each later growth starts from an offset past the end of the
		// scroller.
		for (let i = 0; i < 3; i++) {
			act(() => handle.grow(COUNT - 1, 100))

			await frames(2)
		}

		scroller.dispatchEvent(new TouchEvent('touchend', { bubbles: true }))

		expect(corrections.mock.calls.map(([delta]) => delta)).toEqual([100, 100, 100])
	})
})
