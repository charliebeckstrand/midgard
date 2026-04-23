import { act, renderHook } from '@testing-library/react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useScrollbar } from '../../components/scroll-area/use-scrollbar'

function makeViewport({
	scrollTop = 0,
	scrollLeft = 0,
	clientHeight = 100,
	clientWidth = 100,
	scrollHeight = 200,
	scrollWidth = 200,
}: {
	scrollTop?: number
	scrollLeft?: number
	clientHeight?: number
	clientWidth?: number
	scrollHeight?: number
	scrollWidth?: number
} = {}) {
	const el = document.createElement('div')

	Object.defineProperty(el, 'clientHeight', { configurable: true, value: clientHeight })
	Object.defineProperty(el, 'clientWidth', { configurable: true, value: clientWidth })
	Object.defineProperty(el, 'scrollHeight', { configurable: true, value: scrollHeight })
	Object.defineProperty(el, 'scrollWidth', { configurable: true, value: scrollWidth })

	let _top = scrollTop
	let _left = scrollLeft

	Object.defineProperty(el, 'scrollTop', {
		configurable: true,
		get: () => _top,
		set: (v: number) => {
			_top = v
		},
	})

	Object.defineProperty(el, 'scrollLeft', {
		configurable: true,
		get: () => _left,
		set: (v: number) => {
			_left = v
		},
	})

	return el
}

function makeTrack(size: number) {
	const el = document.createElement('div')

	Object.defineProperty(el, 'clientHeight', { configurable: true, value: size })
	Object.defineProperty(el, 'clientWidth', { configurable: true, value: size })

	return el
}

afterEach(() => {
	vi.useRealTimers()
})

describe('useScrollbar: orientation flags', () => {
	it('enables both axes when orientation is "both"', () => {
		const { result } = renderHook(() => useScrollbar({ orientation: 'both', scrollbar: 'auto' }))

		expect(result.current.hasVertical).toBe(true)

		expect(result.current.hasHorizontal).toBe(true)
	})

	it('only enables the vertical axis when orientation is "vertical"', () => {
		const { result } = renderHook(() =>
			useScrollbar({ orientation: 'vertical', scrollbar: 'auto' }),
		)

		expect(result.current.hasVertical).toBe(true)

		expect(result.current.hasHorizontal).toBe(false)
	})

	it('only enables the horizontal axis when orientation is "horizontal"', () => {
		const { result } = renderHook(() =>
			useScrollbar({ orientation: 'horizontal', scrollbar: 'auto' }),
		)

		expect(result.current.hasVertical).toBe(false)

		expect(result.current.hasHorizontal).toBe(true)
	})

	it('starts with hidden thumbs and isScrolling=false', () => {
		const { result } = renderHook(() => useScrollbar({ orientation: 'both', scrollbar: 'auto' }))

		expect(result.current.verticalThumb.visible).toBe(false)

		expect(result.current.horizontalThumb.visible).toBe(false)

		expect(result.current.isScrolling).toBe(false)
	})
})

describe('useScrollbar: handleScroll', () => {
	it('computes a visible vertical thumb when the viewport is attached', () => {
		const { result } = renderHook(() =>
			useScrollbar({ orientation: 'vertical', scrollbar: 'visible' }),
		)

		const viewport = makeViewport({ scrollTop: 50 })

		const track = makeTrack(100)

		;(result.current.viewportRef as { current: HTMLDivElement | null }).current = viewport

		;(result.current.verticalTrackRef as { current: HTMLDivElement | null }).current = track

		act(() => {
			result.current.handleScroll()
		})

		expect(result.current.verticalThumb.visible).toBe(true)
	})

	it('flips isScrolling on and fades it out on auto mode', () => {
		vi.useFakeTimers()

		const { result } = renderHook(() => useScrollbar({ orientation: 'both', scrollbar: 'auto' }))

		const viewport = makeViewport()

		;(result.current.viewportRef as { current: HTMLDivElement | null }).current = viewport

		act(() => {
			result.current.handleScroll()
		})

		expect(result.current.isScrolling).toBe(true)

		act(() => {
			vi.advanceTimersByTime(1000)
		})

		expect(result.current.isScrolling).toBe(false)
	})

	it('does not flip isScrolling in "visible" mode', () => {
		const { result } = renderHook(() => useScrollbar({ orientation: 'both', scrollbar: 'visible' }))

		const viewport = makeViewport()

		;(result.current.viewportRef as { current: HTMLDivElement | null }).current = viewport

		act(() => {
			result.current.handleScroll()
		})

		expect(result.current.isScrolling).toBe(false)
	})
})

describe('useScrollbar: startDrag', () => {
	function makeEvent(client: { x: number; y: number }) {
		return {
			clientX: client.x,
			clientY: client.y,
			pointerId: 1,
			preventDefault: vi.fn(),
			stopPropagation: vi.fn(),
		} as unknown as ReactPointerEvent<HTMLDivElement>
	}

	it('is a no-op when the viewport is not attached', () => {
		const { result } = renderHook(() => useScrollbar({ orientation: 'both', scrollbar: 'auto' }))

		const event = makeEvent({ x: 0, y: 0 })

		result.current.startDrag('y')(event)

		expect(event.preventDefault).not.toHaveBeenCalled()
	})

	it('prevents default and stops propagation when the drag starts', () => {
		const { result } = renderHook(() => useScrollbar({ orientation: 'both', scrollbar: 'auto' }))

		const viewport = makeViewport()

		const track = makeTrack(100)

		;(result.current.viewportRef as { current: HTMLDivElement | null }).current = viewport

		;(result.current.verticalTrackRef as { current: HTMLDivElement | null }).current = track

		const event = makeEvent({ x: 0, y: 10 })

		result.current.startDrag('y')(event)

		expect(event.preventDefault).toHaveBeenCalled()

		expect(event.stopPropagation).toHaveBeenCalled()
	})

	it('registers pointermove and pointerup listeners on the window', () => {
		const add = vi.spyOn(window, 'addEventListener')

		const { result } = renderHook(() => useScrollbar({ orientation: 'both', scrollbar: 'auto' }))

		const viewport = makeViewport()

		const track = makeTrack(100)

		;(result.current.viewportRef as { current: HTMLDivElement | null }).current = viewport

		;(result.current.verticalTrackRef as { current: HTMLDivElement | null }).current = track

		result.current.startDrag('y')(makeEvent({ x: 0, y: 0 }))

		const kinds = add.mock.calls.map((c) => c[0])

		expect(kinds).toContain('pointermove')

		expect(kinds).toContain('pointerup')

		add.mockRestore()
	})
})
