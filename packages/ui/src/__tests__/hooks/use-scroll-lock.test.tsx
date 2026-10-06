import { render, renderHook } from '@testing-library/react'
import { useLayoutEffect } from 'react'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { useScrollLock } from '../../hooks/use-scroll-lock'

function Lock() {
	useScrollLock(true)

	return null
}

describe('useScrollLock', () => {
	it('locks body overflow while active', () => {
		renderHook(() => useScrollLock(true))

		expect(document.body.style.overflow).toBe('hidden')
	})

	it('restores body overflow on unmount', () => {
		const { unmount } = renderHook(() => useScrollLock(true))

		unmount()

		expect(document.body.style.overflow).toBe('')
	})

	it('leaves overflow untouched when inactive', () => {
		renderHook(() => useScrollLock(false))

		expect(document.body.style.overflow).not.toBe('hidden')
	})

	it('keeps the lock while nested instances overlap', () => {
		const outer = renderHook(() => useScrollLock(true))

		const inner = renderHook(() => useScrollLock(true))

		expect(document.body.style.overflow).toBe('hidden')

		inner.unmount()

		expect(document.body.style.overflow).toBe('hidden')

		outer.unmount()

		expect(document.body.style.overflow).toBe('')
	})

	it('releases the lock when `active` flips from true to false', () => {
		const { rerender } = renderHook(({ active }: { active: boolean }) => useScrollLock(active), {
			initialProps: { active: true },
		})

		expect(document.body.style.overflow).toBe('hidden')

		rerender({ active: false })

		expect(document.body.style.overflow).toBe('')
	})

	it('compensates for the scrollbar width and restores it on release', () => {
		// Patch dimensions to simulate a 15px vertical scrollbar (jsdom has no layout).
		const docEl = document.documentElement

		const patch = (key: 'scrollHeight' | 'clientHeight' | 'clientWidth', value: number) =>
			Object.defineProperty(docEl, key, { configurable: true, value })

		patch('scrollHeight', 2000)

		patch('clientHeight', 1000)

		patch('clientWidth', 1000)

		const innerWidth = Object.getOwnPropertyDescriptor(window, 'innerWidth')

		Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1015 })

		// In `onTestFinished`, not after the assertions below: `innerWidth` and the
		// patched element metrics are process-global, and a failed assertion would
		// otherwise carry them into the next file on this worker.
		onTestFinished(() => {
			for (const key of ['scrollHeight', 'clientHeight', 'clientWidth'] as const) {
				patch(key, 0)
			}

			if (innerWidth) Object.defineProperty(window, 'innerWidth', innerWidth)
		})

		const { unmount } = renderHook(() => useScrollLock(true))

		expect(document.body.style.paddingRight).toBe('15px')

		unmount()

		expect(document.body.style.paddingRight).toBe('')
	})

	it('holds the lock before the browser paints the commit that takes it', () => {
		let seen = ''

		function Probe() {
			// A layout effect runs before paint, after the layout effects of earlier siblings.
			useLayoutEffect(() => {
				seen = document.body.style.overflow
			}, [])

			return null
		}

		const { unmount } = render(
			<>
				<Lock />
				<Probe />
			</>,
		)

		onTestFinished(unmount)

		expect(seen).toBe('hidden')
	})

	it('pads the left side when the scrollbar is on the left (RTL in WebKit and Gecko)', () => {
		const html = document.documentElement

		// A 15px scrollbar on the left: the root box starts 15px from the left edge.
		vi.spyOn(html, 'scrollHeight', 'get').mockReturnValue(2000)
		vi.spyOn(html, 'clientHeight', 'get').mockReturnValue(800)
		vi.spyOn(html, 'clientWidth', 'get').mockReturnValue(1009)
		vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1024)
		vi.spyOn(html, 'getBoundingClientRect').mockReturnValue(new DOMRect(15, 0, 1009, 800))

		html.dir = 'rtl'

		onTestFinished(() => {
			html.dir = ''

			vi.restoreAllMocks()
		})

		const { unmount } = render(<Lock />)

		expect(document.body.style.paddingLeft).toBe('15px')

		expect(document.body.style.paddingRight).toBe('')

		unmount()

		expect(document.body.style.paddingLeft).toBe('')
	})
})
