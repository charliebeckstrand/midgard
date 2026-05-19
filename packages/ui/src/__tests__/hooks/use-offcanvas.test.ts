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
})

describe('useOffcanvas — breakpoint listener', () => {
	const originalGetComputedStyle = window.getComputedStyle
	const originalMatchMedia = window.matchMedia

	afterEach(() => {
		window.getComputedStyle = originalGetComputedStyle
		window.matchMedia = originalMatchMedia
	})

	it('auto-closes when the viewport crosses --breakpoint-lg', () => {
		let mqlHandler: (() => void) | undefined

		const mqlMock = {
			matches: false,
			media: '',
			addEventListener: vi.fn((_: string, handler: () => void) => {
				mqlHandler = handler
			}),
			removeEventListener: vi.fn(),
		}

		window.getComputedStyle = (() => ({
			getPropertyValue: () => '1024px',
		})) as unknown as typeof window.getComputedStyle

		window.matchMedia = vi.fn(() => mqlMock) as unknown as typeof window.matchMedia

		const { result } = renderHook(() => useOffcanvas())

		act(() => {
			result.current.setOpen(true)
		})

		expect(result.current.open).toBe(true)

		mqlMock.matches = true

		act(() => {
			mqlHandler?.()
		})

		expect(result.current.open).toBe(false)
	})

	it('stays open when the media query reports non-match', () => {
		let mqlHandler: (() => void) | undefined

		const mqlMock = {
			matches: false,
			media: '',
			addEventListener: vi.fn((_: string, handler: () => void) => {
				mqlHandler = handler
			}),
			removeEventListener: vi.fn(),
		}

		window.getComputedStyle = (() => ({
			getPropertyValue: () => '1024px',
		})) as unknown as typeof window.getComputedStyle

		window.matchMedia = vi.fn(() => mqlMock) as unknown as typeof window.matchMedia

		const { result } = renderHook(() => useOffcanvas())

		act(() => {
			result.current.setOpen(true)
		})

		act(() => {
			mqlHandler?.()
		})

		expect(result.current.open).toBe(true)
	})

	it('bails when --breakpoint-lg is undefined', () => {
		window.getComputedStyle = (() => ({
			getPropertyValue: () => '',
		})) as unknown as typeof window.getComputedStyle

		const matchMediaSpy = vi.fn()

		window.matchMedia = matchMediaSpy as unknown as typeof window.matchMedia

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

		window.getComputedStyle = (() => ({
			getPropertyValue: () => '1024px',
		})) as unknown as typeof window.getComputedStyle

		window.matchMedia = vi.fn(() => mqlMock) as unknown as typeof window.matchMedia

		const { unmount } = renderHook(() => useOffcanvas())

		unmount()

		expect(mqlMock.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
	})
})
