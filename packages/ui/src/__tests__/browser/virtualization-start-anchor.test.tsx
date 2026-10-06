import { useCallback, useRef, useState } from 'react'
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { useVirtualWindow } from '../../hooks'
import { act, frames, present, renderUI, waitFor } from '../helpers'
import { settledValue } from './helpers/sample'

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

	/** Renders the list, and waits for its first rows. */
	async function mount(bounded = true) {
		const handle: Handle = { prepend: () => {}, insertBefore: () => {} }

		const { container } = renderUI(<List handle={handle} bounded={bounded} />)

		const scroller = present(
			container.querySelector<HTMLElement>('[data-slot="anchored-list"]'),
			'the scroll container',
		)

		await waitFor(() => expect(scroller.querySelector('[data-row]')).not.toBeNull())

		return { handle, scroller }
	}

	/**
	 * Scrolls to `top`. The rows around the new offset measure over a few frames,
	 * so this waits until the offset holds still.
	 */
	async function scrollAndSettle(scroller: HTMLElement, top: number) {
		scroller.scrollTop = top

		await settledValue(() => scroller.scrollTop)
	}

	it('holds the first row in view still when rows are inserted above it, and then stops', async () => {
		const { handle, scroller } = await mount()

		await scrollAndSettle(scroller, 2000)

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
		const { handle, scroller } = await mount()

		await scrollAndSettle(scroller, 2000)

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

	it('keeps the held offset when the scroll-end timer fires before the scroll event of the move', async ({
		signal,
	}) => {
		const { handle, scroller } = await mount()

		// The virtualizer ends a scroll with a timer that it sets again on each
		// `scroll` event, 150 ms after the last one. The case holds that timer, so
		// it can fire the timer at the one point where the order matters.
		const timeout = window.setTimeout.bind(window)

		let scrollEnd: (() => void) | null = null

		signal.throwIfAborted()

		const held = vi.spyOn(window, 'setTimeout')

		// The spy holds each 150 ms timer of the page. `restoreMocks` acts only
		// before the next case, so the spy would hold the timers of this teardown
		// too.
		onTestFinished(() => held.mockRestore())

		held.mockImplementation(((callback: () => void, delay?: number, ...rest: unknown[]) => {
			if (delay !== 150) return timeout(callback, delay, ...rest)

			scrollEnd = callback

			return 0
		}) as typeof window.setTimeout)

		await scrollAndSettle(scroller, 2000)

		const anchor = Array.from(scroller.querySelectorAll<HTMLElement>('[data-row]')).find(
			(row) => row.getBoundingClientRect().top >= scroller.getBoundingClientRect().top,
		)

		if (!anchor || !scrollEnd) throw new Error('no row in view, or no scroll-end timer')

		const id = anchor.dataset.row

		const before = anchor.getBoundingClientRect().top

		// A hundred rows above the anchor. None of them has measured, and most
		// differ from the estimate.
		act(() => handle.prepend(Array.from({ length: 100 }, (_, i) => 1000 + i)))

		// The move sends its `scroll` event at the next frame. Under load, the timer
		// can fire first, and it must not put the offset before the move back into
		// the window: the rows there would then measure with no correction.
		act(() => (scrollEnd as () => void)())

		await frames()

		await frames()

		const after = scroller.querySelector<HTMLElement>(`[data-row="${id}"]`)

		expect(
			Math.abs((after?.getBoundingClientRect().top ?? Number.NaN) - before),
		).toBeLessThanOrEqual(1)
	})

	it('keeps the top when rows are inserted above the first row at the offset zero', async () => {
		const { handle, scroller } = await mount()

		act(() => handle.prepend([3000, 3001, 3002]))

		await frames()

		await frames()

		expect(scroller.scrollTop).toBe(0)

		expect(scroller.querySelector('[data-row]')?.getAttribute('data-row')).toBe('3000')
	})

	it('does nothing in a scroller that does not scroll', async () => {
		const { handle, scroller } = await mount(false)

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
