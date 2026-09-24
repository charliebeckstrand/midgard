import { useCallback, useRef, useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { useVirtualWindow } from '../../hooks'
import { act, frames, renderUI, waitFor } from '../helpers'

/**
 * The start anchor of the measured path, in a real browser. The anchor moves
 * the scroller when rows above the first row in view change. It must end: a
 * correction must not start another one. A loop of that kind blocks the page,
 * so the case counts the renders and stops a loop with an error.
 */
describe('useVirtualWindow start anchor (real browser)', () => {
	/** The most renders a case allows. A loop passes it at once. */
	const RENDER_CAP = 400

	const renders = { count: 0 }

	afterEach(() => {
		renders.count = 0
	})

	type Handle = {
		prepend: (ids: number[]) => void
		insertBefore: (id: number, ids: number[]) => void
	}

	const heightOf = (id: number) => 30 + ((id * 37) % 90)

	function List({ handle, bounded }: { handle: Handle; bounded: boolean }) {
		renders.count++

		if (renders.count > RENDER_CAP) throw new Error('the window renders in a loop')

		const scrollRef = useRef<HTMLDivElement>(null)

		const [ids, setIds] = useState(() => Array.from({ length: 200 }, (_, i) => i))

		handle.prepend = (next) => setIds((current) => [...next, ...current])

		handle.insertBefore = (id, next) =>
			setIds((current) => {
				const at = current.indexOf(id)

				return [...current.slice(0, at), ...next, ...current.slice(at)]
			})

		const getItemKey = useCallback((index: number) => ids[index] ?? index, [ids])

		const { virtualItems, topSpacer, bottomSpacer, measureRef } = useVirtualWindow({
			count: ids.length,
			getScrollElement: () => scrollRef.current,
			estimateSize: 44,
			overscan: 2,
			getItemKey,
		})

		// An unbounded scroller grows to its content and never scrolls. The native
		// scroll anchoring of the browser is off, so the case holds the hook alone.
		const style = bounded
			? { height: 300, overflow: 'auto', overflowAnchor: 'none' as const }
			: { overflow: 'auto', overflowAnchor: 'none' as const }

		return (
			<div ref={scrollRef} data-slot="anchored-list" style={style}>
				<div style={{ height: topSpacer }} />
				{virtualItems.map((virtualItem) => {
					const id = ids[virtualItem.index] ?? -1

					return (
						<div
							key={virtualItem.key}
							ref={measureRef}
							data-index={virtualItem.index}
							data-row={id}
							style={{ height: heightOf(id) }}
						>
							Row {id}
						</div>
					)
				})}
				<div style={{ height: bottomSpacer }} />
			</div>
		)
	}

	it('holds the first row in view still when rows are inserted above it, and then stops', async () => {
		const handle: Handle = { prepend: () => {}, insertBefore: () => {} }

		const { container } = renderUI(<List handle={handle} bounded />)

		const scroller = container.querySelector<HTMLElement>('[data-slot="anchored-list"]')

		if (!scroller) throw new Error('scroll container not found')

		await waitFor(() => expect(scroller.querySelector('[data-row]')).not.toBeNull())

		scroller.scrollTop = 2000

		// The rows around the new offset measure over a few frames. Wait until
		// the offset holds still.
		let last = -1

		while (last !== scroller.scrollTop) {
			last = scroller.scrollTop

			await frames()
		}

		const anchor = Array.from(scroller.querySelectorAll<HTMLElement>('[data-row]')).find(
			(row) => row.getBoundingClientRect().top >= scroller.getBoundingClientRect().top,
		)

		if (!anchor) throw new Error('no row in view')

		const id = anchor.dataset.row

		const before = anchor.getBoundingClientRect().top

		act(() => handle.prepend([1000, 1001, 1002]))

		await frames()

		await frames()

		const after = scroller.querySelector<HTMLElement>(`[data-row="${id}"]`)

		expect(
			Math.abs((after?.getBoundingClientRect().top ?? Number.NaN) - before),
		).toBeLessThanOrEqual(1)

		// The window settles: a few more frames add no renders.
		const settled = renders.count

		await frames()

		await frames()

		expect(renders.count).toBe(settled)
	})

	it('holds the first row in view in the commit of the change, while the reader scrolls', async () => {
		const handle: Handle = { prepend: () => {}, insertBefore: () => {} }

		const { container } = renderUI(<List handle={handle} bounded />)

		const scroller = container.querySelector<HTMLElement>('[data-slot="anchored-list"]')

		if (!scroller) throw new Error('scroll container not found')

		await waitFor(() => expect(scroller.querySelector('[data-row]')).not.toBeNull())

		scroller.scrollTop = 2000

		let last = -1

		while (last !== scroller.scrollTop) {
			last = scroller.scrollTop

			await frames()
		}

		const rows = () => Array.from(scroller.querySelectorAll<HTMLElement>('[data-row]'))

		const edge = () => scroller.getBoundingClientRect().top

		// The anchor holds the first row that ends below the top edge. The rows go
		// in above it, where the window renders them at once.
		const first = rows().find((row) => row.getBoundingClientRect().bottom > edge())

		const anchor = rows().find((row) => row.getBoundingClientRect().top >= edge())

		if (!first || !anchor) throw new Error('no row in view')

		const id = anchor.dataset.row

		// A scroll sets the flag of the virtualizer that tells it the reader
		// scrolls, for 150 ms. The library does not measure a row that attaches
		// while the flag is set.
		const scrolled = new Promise((resolve) => {
			scroller.addEventListener('scroll', resolve, { once: true })
		})

		scroller.scrollTop += 1

		await scrolled

		const before = anchor.getBoundingClientRect().top

		act(() => handle.insertBefore(Number(first.dataset.row), [5000, 5001, 5002]))

		// Read in the same task, before a paint or a `ResizeObserver` callback.
		const after = scroller.querySelector<HTMLElement>(`[data-row="${id}"]`)

		expect(
			Math.abs((after?.getBoundingClientRect().top ?? Number.NaN) - before),
		).toBeLessThanOrEqual(1)
	})

	it('does nothing in a scroller that does not scroll', async () => {
		const handle: Handle = { prepend: () => {}, insertBefore: () => {} }

		const { container } = renderUI(<List handle={handle} bounded={false} />)

		const scroller = container.querySelector<HTMLElement>('[data-slot="anchored-list"]')

		if (!scroller) throw new Error('scroll container not found')

		await waitFor(() => expect(scroller.querySelector('[data-row]')).not.toBeNull())

		for (let round = 0; round < 5; round++) {
			act(() => handle.prepend([2000 + round]))

			await frames()
		}

		const settled = renders.count

		await frames()

		await frames()

		expect(scroller.scrollTop).toBe(0)

		expect(renders.count).toBe(settled)
	})
})
