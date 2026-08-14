import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
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

	window.getComputedStyle = impl
}

type MqlMock = Pick<
	MediaQueryList,
	'matches' | 'media' | 'addEventListener' | 'removeEventListener'
>

function stubMatchMedia(mql: MqlMock): ReturnType<typeof vi.fn> {
	const partial: Partial<MediaQueryList> = mql

	const spy = vi.fn((_query: string): MediaQueryList => partial as MediaQueryList)

	window.matchMedia = spy

	return spy
}

/**
 * Stubs the breakpoint token and `matchMedia`, and returns `cross` — set the query's
 * verdict and fire the listener the hook registered. Call before `renderHook`; `cross`
 * reads the captured handler when it runs, not when it is built.
 */
function stubViewportCrossing(): { cross: (matches: boolean) => void } {
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

	stubMatchMedia(mql)

	return {
		cross: (matches: boolean) => {
			mql.matches = matches

			handler?.()
		},
	}
}

describe('useOffcanvas: breakpoint listener', () => {
	const originalGetComputedStyle = window.getComputedStyle

	const originalMatchMedia = window.matchMedia

	afterEach(() => {
		window.getComputedStyle = originalGetComputedStyle

		window.matchMedia = originalMatchMedia
	})

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

		window.matchMedia = matchMediaSpy as typeof window.matchMedia

		renderHook(() => useOffcanvas())

		expect(matchMediaSpy).not.toHaveBeenCalled()
	})

	it('removes the change listener on unmount', () => {
		const mqlMock = {
			matches: false,
			media: '',
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		}

		stubBreakpoint('1024px')

		stubMatchMedia(mqlMock)

		const { unmount } = renderHook(() => useOffcanvas())

		unmount()

		expect(mqlMock.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
	})
})
