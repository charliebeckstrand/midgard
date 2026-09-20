import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useOffcanvas } from '../../hooks/use-offcanvas'

describe('useOffcanvas', () => {
	it('starts closed', () => {
		const { result } = renderHook(() => useOffcanvas())

		expect(result.current.open).toBe(false)
	})

	it('opens when setOpen(true) is called', () => {
		const { result } = renderHook(() => useOffcanvas())

		act(() => {
			result.current.setOpen(true)
		})

		expect(result.current.open).toBe(true)
	})

	it('closes when close() is called', () => {
		const { result } = renderHook(() => useOffcanvas())

		act(() => {
			result.current.setOpen(true)
		})

		act(() => {
			result.current.close()
		})

		expect(result.current.open).toBe(false)
	})

	it('returns a stable close reference across renders', () => {
		const { result, rerender } = renderHook(() => useOffcanvas())

		const first = result.current.close

		rerender()

		expect(result.current.close).toBe(first)
	})

	it('reports both ends of the open state', () => {
		const onOpenChange = vi.fn()

		const { result } = renderHook(() => useOffcanvas({ onOpenChange }))

		// Mounting closed is not a transition, so there is nothing to report yet.
		expect(onOpenChange).not.toHaveBeenCalled()

		act(() => {
			result.current.setOpen(true)
		})

		expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(true)

		act(() => {
			result.current.close()
		})

		expect(onOpenChange).toHaveBeenLastCalledWith(false)

		expect(onOpenChange).toHaveBeenCalledTimes(2)
	})

	it('says nothing when a set leaves the flag where it already was', () => {
		const onOpenChange = vi.fn()

		const { result } = renderHook(() => useOffcanvas({ onOpenChange }))

		act(() => {
			result.current.close()
		})

		expect(onOpenChange).not.toHaveBeenCalled()
	})
})

function stubBreakpoint(value: string): void {
	const partial: Partial<CSSStyleDeclaration> = { getPropertyValue: () => value }

	const impl: typeof window.getComputedStyle = () => partial as CSSStyleDeclaration

	vi.stubGlobal('getComputedStyle', impl)
}

type MqlMock = Pick<
	MediaQueryList,
	'matches' | 'media' | 'addEventListener' | 'removeEventListener'
>

/**
 * Serves one caller-owned `MediaQueryList` for every query.
 *
 * Named apart from the `stubMatchMedia` helper on the test barrel, which it
 * would otherwise shadow: that one builds a fresh inert list per query from a
 * predicate, and these cases need one object they keep a handle on, so they can
 * flip `matches` and fire the listener the hook registered.
 */
function stubFixedMediaQuery(mql: MqlMock): void {
	const partial: Partial<MediaQueryList> = mql

	vi.stubGlobal(
		'matchMedia',
		vi.fn((_query: string): MediaQueryList => partial as MediaQueryList),
	)
}

/**
 * Stubs the breakpoint token and `matchMedia`, and returns the mock plus `cross` — set
 * the query's verdict and fire the listener the hook registered. Call before
 * `renderHook`; `cross` reads the captured handler when it runs, not when it is built.
 */
function stubViewportCrossing(): { mql: MqlMock; cross: (matches: boolean) => void } {
	let handler: (() => void) | undefined

	const mql = {
		matches: false,
		media: '',
		addEventListener: vi.fn((_: string, next: () => void) => {
			handler = next
		}),
		removeEventListener: vi.fn(),
	}

	stubBreakpoint('1024px')

	stubFixedMediaQuery(mql)

	return {
		mql,
		cross: (matches: boolean) => {
			mql.matches = matches

			handler?.()
		},
	}
}

describe('useOffcanvas: breakpoint listener', () => {
	it('auto-closes when the viewport crosses --breakpoint-lg', () => {
		const { cross } = stubViewportCrossing()

		const { result } = renderHook(() => useOffcanvas())

		act(() => {
			result.current.setOpen(true)
		})

		expect(result.current.open).toBe(true)

		act(() => {
			cross(true)
		})

		expect(result.current.open).toBe(false)
	})

	it('stays open when the media query reports non-match', () => {
		const { cross } = stubViewportCrossing()

		const { result } = renderHook(() => useOffcanvas())

		act(() => {
			result.current.setOpen(true)
		})

		act(() => {
			cross(false)
		})

		expect(result.current.open).toBe(true)
	})

	it('reports the auto-close, a route no caller drove', () => {
		const { cross } = stubViewportCrossing()

		const onOpenChange = vi.fn()

		const { result } = renderHook(() => useOffcanvas({ onOpenChange }))

		act(() => {
			result.current.setOpen(true)
		})

		expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(true)

		act(() => {
			cross(true)
		})

		expect(onOpenChange).toHaveBeenLastCalledWith(false)

		expect(onOpenChange).toHaveBeenCalledTimes(2)
	})

	it('bails when --breakpoint-lg is undefined', () => {
		stubBreakpoint('')

		const matchMediaSpy = vi.fn()

		vi.stubGlobal('matchMedia', matchMediaSpy)

		renderHook(() => useOffcanvas())

		expect(matchMediaSpy).not.toHaveBeenCalled()
	})

	it('removes the change listener on unmount', () => {
		const { mql } = stubViewportCrossing()

		const { unmount } = renderHook(() => useOffcanvas())

		unmount()

		expect(mql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
	})
})
