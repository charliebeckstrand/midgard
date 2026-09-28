import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SidebarLayout } from '../../layouts/sidebar/sidebar'
import { useSidebarPagePin } from '../../layouts/sidebar/use-sidebar-page-pin'
import { renderUI } from '../helpers'
import { withFakeTime } from '../helpers/with-fake-time'

// The state that Chrome on iOS leaves: the page has nothing to scroll, but it
// reports the height of the top bar as its offset.
const TOP_BAR = 112

type Viewport = { scale: number; height: number; offsetTop: number }

let viewport: EventTarget & Viewport

const scrollTo = vi.fn()

// The config undoes each global stub and each spy after the case.
beforeEach(() => {
	viewport = Object.assign(new EventTarget(), {
		scale: 1,
		height: window.innerHeight,
		offsetTop: TOP_BAR,
	})

	vi.stubGlobal('visualViewport', viewport)

	vi.stubGlobal('scrollTo', scrollTo)

	vi.stubGlobal('scrollY', TOP_BAR)
})

describe('useSidebarPagePin', () => {
	it('scrolls the page back to its top once it settles', async () => {
		await withFakeTime(async (clock) => {
			renderHook(() => useSidebarPagePin())

			await clock.advance(149)

			expect(scrollTo).not.toHaveBeenCalled()

			await clock.advance(1)

			expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 0, behavior: 'instant' })
		})
	})

	it('reads the offset of the visual viewport when the page offset is zero', async () => {
		vi.stubGlobal('scrollY', 0)

		await withFakeTime(async (clock) => {
			renderHook(() => useSidebarPagePin())

			await clock.advance(150)

			expect(scrollTo).toHaveBeenCalledOnce()
		})
	})

	it('waits until the scroll and viewport events stop', async () => {
		await withFakeTime(async (clock) => {
			renderHook(() => useSidebarPagePin())

			await clock.advance(100)

			window.dispatchEvent(new Event('scroll'))

			await clock.advance(100)

			viewport.dispatchEvent(new Event('resize'))

			await clock.advance(100)

			viewport.dispatchEvent(new Event('scroll'))

			await clock.advance(100)

			expect(scrollTo).not.toHaveBeenCalled()

			await clock.advance(50)

			expect(scrollTo).toHaveBeenCalledOnce()
		})
	})

	it('checks again after the page returns from the back-forward cache', async () => {
		await withFakeTime(async (clock) => {
			renderHook(() => useSidebarPagePin())

			await clock.advance(150)

			scrollTo.mockClear()

			window.dispatchEvent(new Event('pageshow'))

			await clock.advance(150)

			expect(scrollTo).toHaveBeenCalledOnce()
		})
	})

	it.each([
		[
			'a page at its top',
			() => {
				vi.stubGlobal('scrollY', 0)

				viewport.offsetTop = 0
			},
		],
		[
			'a page with a height to scroll',
			() => {
				vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(
					document.documentElement.clientHeight + 1,
				)
			},
		],
		['a zoomed page', () => Object.assign(viewport, { scale: 2 })],
		[
			'a page with the keyboard open',
			() => Object.assign(viewport, { height: window.innerHeight / 2 }),
		],
	])('does not move %s', async (_, arrange) => {
		arrange()

		await withFakeTime(async (clock) => {
			renderHook(() => useSidebarPagePin())

			window.dispatchEvent(new Event('scroll'))

			await clock.advance(150)

			expect(scrollTo).not.toHaveBeenCalled()
		})
	})

	it('stops the check when it unmounts', async () => {
		await withFakeTime(async (clock) => {
			const { unmount } = renderHook(() => useSidebarPagePin())

			unmount()

			window.dispatchEvent(new Event('scroll'))

			viewport.dispatchEvent(new Event('resize'))

			await clock.advance(150)

			expect(scrollTo).not.toHaveBeenCalled()
		})
	})

	it('runs under SidebarLayout', async () => {
		await withFakeTime(async (clock) => {
			renderUI(<SidebarLayout sidebar={<div>sidebar</div>}>body</SidebarLayout>)

			await clock.advance(150)

			expect(scrollTo).toHaveBeenCalledOnce()
		})
	})
})
