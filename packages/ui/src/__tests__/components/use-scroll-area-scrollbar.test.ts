import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useScrollAreaScrollbar } from '../../components/scroll-area/use-scroll-area-scrollbar'
import { makePointerEvent, mockDomGeometry } from '../helpers'

function setupHook(orientation: 'vertical' | 'horizontal' | 'both', scrollbar: 'auto' | 'visible') {
	const hook = renderHook(() => useScrollAreaScrollbar({ orientation, scrollbar }))

	const viewport = mockDomGeometry(document.createElement('div'), {
		clientHeight: 100,
		clientWidth: 100,
		scrollHeight: 400,
		scrollWidth: 100,
		scrollTop: 0,
		scrollLeft: 0,
	})

	const vTrack = mockDomGeometry(document.createElement('div'), { clientHeight: 100 })

	const hTrack = mockDomGeometry(document.createElement('div'), { clientWidth: 100 })

	hook.result.current.viewportRef.current = viewport

	hook.result.current.verticalTrackRef.current = vTrack

	hook.result.current.horizontalTrackRef.current = hTrack

	return { hook, viewport, vTrack, hTrack }
}

describe('useScrollAreaScrollbar', () => {
	describe('orientation flags', () => {
		it('exposes only hasVertical for orientation="vertical"', () => {
			const { result } = renderHook(() =>
				useScrollAreaScrollbar({ orientation: 'vertical', scrollbar: 'visible' }),
			)

			expect(result.current.hasVertical).toBe(true)
			expect(result.current.hasHorizontal).toBe(false)
		})

		it('exposes only hasHorizontal for orientation="horizontal"', () => {
			const { result } = renderHook(() =>
				useScrollAreaScrollbar({ orientation: 'horizontal', scrollbar: 'visible' }),
			)

			expect(result.current.hasVertical).toBe(false)
			expect(result.current.hasHorizontal).toBe(true)
		})

		it('exposes both flags for orientation="both"', () => {
			const { result } = renderHook(() =>
				useScrollAreaScrollbar({ orientation: 'both', scrollbar: 'visible' }),
			)

			expect(result.current.hasVertical).toBe(true)
			expect(result.current.hasHorizontal).toBe(true)
		})
	})

	describe('initial state', () => {
		it('starts with hidden thumbs and isScrolling=false', () => {
			const { result } = renderHook(() =>
				useScrollAreaScrollbar({ orientation: 'both', scrollbar: 'auto' }),
			)

			expect(result.current.verticalThumb).toEqual({ size: 0, offset: 0, visible: false })
			expect(result.current.horizontalThumb).toEqual({ size: 0, offset: 0, visible: false })
			expect(result.current.isScrolling).toBe(false)
		})
	})

	describe('thumb computation via handleScroll', () => {
		it('computes a visible vertical thumb proportional to viewport/content ratio', () => {
			const { hook, viewport } = setupHook('vertical', 'visible')

			act(() => hook.result.current.handleScroll())

			// viewport=100, content=400, track=100 → rawSize=25, clamped to MIN_THUMB_SIZE=20 → 25
			expect(hook.result.current.verticalThumb.size).toBe(25)
			expect(hook.result.current.verticalThumb.offset).toBe(0)
			expect(hook.result.current.verticalThumb.visible).toBe(true)

			mockDomGeometry(viewport, { scrollTop: 150 })

			act(() => hook.result.current.handleScroll())

			// maxScroll=300, scrollTop=150 → ratio 0.5 → offset 0.5 * (100-25) = 37.5
			expect(hook.result.current.verticalThumb.offset).toBe(37.5)
		})

		it('hides the thumb when content fits in the viewport', () => {
			const { hook, viewport } = setupHook('vertical', 'visible')

			mockDomGeometry(viewport, { scrollHeight: 80 })

			act(() => hook.result.current.handleScroll())

			expect(hook.result.current.verticalThumb).toEqual({ size: 0, offset: 0, visible: false })
		})

		it('clamps thumb size to MIN_THUMB_SIZE when raw size is smaller', () => {
			const { hook, viewport } = setupHook('vertical', 'visible')

			// viewport=100, content=2000, track=100 → raw=5 → clamped to 20
			mockDomGeometry(viewport, { scrollHeight: 2000 })

			act(() => hook.result.current.handleScroll())

			expect(hook.result.current.verticalThumb.size).toBe(20)
		})

		it('updates only the active axis when orientation is single', () => {
			const { hook } = setupHook('vertical', 'visible')

			act(() => hook.result.current.handleScroll())

			expect(hook.result.current.horizontalThumb.visible).toBe(false)
		})
	})

	describe('scrollbar="auto" fade behavior', () => {
		beforeEach(() => {
			vi.useFakeTimers()
		})

		afterEach(() => {
			vi.useRealTimers()
		})

		it('sets isScrolling=true on scroll and fades after the delay', () => {
			const { hook } = setupHook('vertical', 'auto')

			act(() => hook.result.current.handleScroll())

			expect(hook.result.current.isScrolling).toBe(true)

			act(() => {
				vi.advanceTimersByTime(800)
			})

			expect(hook.result.current.isScrolling).toBe(false)
		})

		it('resets the fade timer on each scroll', () => {
			const { hook } = setupHook('vertical', 'auto')

			act(() => hook.result.current.handleScroll())

			act(() => {
				vi.advanceTimersByTime(600)
			})

			act(() => hook.result.current.handleScroll())

			act(() => {
				vi.advanceTimersByTime(600)
			})

			expect(hook.result.current.isScrolling).toBe(true)

			act(() => {
				vi.advanceTimersByTime(300)
			})

			expect(hook.result.current.isScrolling).toBe(false)
		})

		it('does not toggle isScrolling when scrollbar="visible"', () => {
			const { hook } = setupHook('vertical', 'visible')

			act(() => hook.result.current.handleScroll())

			expect(hook.result.current.isScrolling).toBe(false)
		})
	})

	describe('handleScroll noop without a viewport', () => {
		it('does nothing when viewportRef is null', () => {
			const { result } = renderHook(() =>
				useScrollAreaScrollbar({ orientation: 'vertical', scrollbar: 'visible' }),
			)

			expect(() => act(() => result.current.handleScroll())).not.toThrow()
			expect(result.current.verticalThumb.visible).toBe(false)
		})
	})

	describe('startDrag', () => {
		it('returns a function; calling it without refs is a noop', () => {
			const { result } = renderHook(() =>
				useScrollAreaScrollbar({ orientation: 'vertical', scrollbar: 'visible' }),
			)

			const handler = result.current.startDrag('y')

			expect(typeof handler).toBe('function')

			const event = makePointerEvent<HTMLDivElement>({ clientY: 0, clientX: 0 })

			expect(() => handler(event)).not.toThrow()
			expect(event.preventDefault).not.toHaveBeenCalled()
		})

		it('attaches pointermove/pointerup listeners and scrolls the viewport during drag', () => {
			const { hook, viewport } = setupHook('vertical', 'visible')

			act(() => hook.result.current.handleScroll())

			const handler = hook.result.current.startDrag('y')

			const preventDefault = vi.fn()

			const stopPropagation = vi.fn()

			act(() => {
				handler(
					makePointerEvent<HTMLDivElement>({
						clientY: 0,
						clientX: 0,
						preventDefault,
						stopPropagation,
					}),
				)
			})

			expect(preventDefault).toHaveBeenCalled()
			expect(stopPropagation).toHaveBeenCalled()

			act(() => {
				window.dispatchEvent(new PointerEvent('pointermove', { clientY: 10 }))
			})

			// trackSize=100, thumbSize=25 → maxOffset=75; maxScroll=300; scale=4
			// delta=10 → scrollTop=40
			expect(viewport.scrollTop).toBe(40)

			act(() => {
				window.dispatchEvent(new PointerEvent('pointerup'))
			})

			// After pointerup, further moves are ignored.
			act(() => {
				window.dispatchEvent(new PointerEvent('pointermove', { clientY: 50 }))
			})

			expect(viewport.scrollTop).toBe(40)
		})

		it('stops the drag on pointercancel', () => {
			const { hook, viewport } = setupHook('vertical', 'visible')

			act(() => hook.result.current.handleScroll())

			const handler = hook.result.current.startDrag('y')

			act(() => {
				handler(makePointerEvent<HTMLDivElement>({ clientY: 0, clientX: 0 }))
			})

			act(() => {
				window.dispatchEvent(new PointerEvent('pointercancel'))
			})

			// A cancelled pointer must end the drag; buttonless moves do nothing.
			act(() => {
				window.dispatchEvent(new PointerEvent('pointermove', { clientY: 50 }))
			})

			expect(viewport.scrollTop).toBe(0)
		})

		it('cleans up listeners on unmount mid-drag', () => {
			const { hook, viewport } = setupHook('vertical', 'visible')

			act(() => hook.result.current.handleScroll())

			const handler = hook.result.current.startDrag('y')

			act(() => {
				handler(makePointerEvent<HTMLDivElement>({ clientY: 0, clientX: 0 }))
			})

			hook.unmount()

			act(() => {
				window.dispatchEvent(new PointerEvent('pointermove', { clientY: 100 }))
			})

			// scrollTop must not be mutated after unmount.
			expect(viewport.scrollTop).toBe(0)
		})

		it('drags the horizontal axis when axis="x"', () => {
			const { hook, viewport } = setupHook('horizontal', 'visible')

			mockDomGeometry(viewport, { scrollWidth: 400, clientWidth: 100, scrollHeight: 100 })

			act(() => hook.result.current.handleScroll())

			const handler = hook.result.current.startDrag('x')

			act(() => {
				handler(makePointerEvent<HTMLDivElement>({ clientX: 0, clientY: 0 }))
			})

			act(() => {
				window.dispatchEvent(new PointerEvent('pointermove', { clientX: 5 }))
			})

			// Same geometry as the vertical drag test, but scrollLeft must move
			// instead of scrollTop.
			expect(viewport.scrollLeft).toBeGreaterThan(0)
		})

		it('cleans up a prior drag if startDrag is called again before pointerup', () => {
			const { hook, viewport } = setupHook('vertical', 'visible')

			act(() => hook.result.current.handleScroll())

			const handler = hook.result.current.startDrag('y')

			act(() => {
				handler(makePointerEvent<HTMLDivElement>({ clientY: 0, clientX: 0 }))
			})

			// Restart the drag from a new origin; the prior cleanup runs first.
			act(() => {
				handler(makePointerEvent<HTMLDivElement>({ clientY: 50, clientX: 0 }))
			})

			act(() => {
				window.dispatchEvent(new PointerEvent('pointermove', { clientY: 60 }))
			})

			// The new drag uses the new startClient = 50; delta = 10 → scrollTop 40.
			expect(viewport.scrollTop).toBe(40)
		})

		it('clamps scale to 0 when the track has no room for the thumb', () => {
			// trackSize - thumbSize <= 0 → scale = 0 → onMove leaves scrollTop alone.
			const { hook, viewport, vTrack } = setupHook('vertical', 'visible')

			act(() => hook.result.current.handleScroll())

			mockDomGeometry(vTrack, { clientHeight: 10 })

			const handler = hook.result.current.startDrag('y')

			act(() => {
				handler(makePointerEvent<HTMLDivElement>({ clientY: 0, clientX: 0 }))
			})

			act(() => {
				window.dispatchEvent(new PointerEvent('pointermove', { clientY: 200 }))
			})

			expect(viewport.scrollTop).toBe(0)
		})
	})
})
