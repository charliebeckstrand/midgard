// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAutoDraw } from '../hooks/use-auto-draw'

const KEY = 'numbers:auto-draw'

afterEach(() => {
	cleanup()

	vi.restoreAllMocks()

	window.localStorage.clear()
})

describe('useAutoDraw', () => {
	it('is off when the storage has no setting', () => {
		const { result } = renderHook(() => useAutoDraw())

		expect(result.current[0]).toBe(false)
	})

	it('reads the stored setting', () => {
		window.localStorage.setItem(KEY, 'on')

		const { result } = renderHook(() => useAutoDraw())

		expect(result.current[0]).toBe(true)
	})

	it('writes the setting, and tells each reader in the tab', () => {
		const first = renderHook(() => useAutoDraw())
		const second = renderHook(() => useAutoDraw())

		act(() => first.result.current[1](true))

		expect(window.localStorage.getItem(KEY)).toBe('on')
		expect(first.result.current[0]).toBe(true)
		expect(second.result.current[0]).toBe(true)

		act(() => first.result.current[1](false))

		expect(window.localStorage.getItem(KEY)).toBe('off')
		expect(second.result.current[0]).toBe(false)
	})

	it('follows a write in another tab', () => {
		const { result } = renderHook(() => useAutoDraw())

		act(() => {
			window.localStorage.setItem(KEY, 'on')

			window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: 'on' }))
		})

		expect(result.current[0]).toBe(true)
	})

	it('is off when the storage refuses the read', () => {
		vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
			throw new DOMException('Refused', 'SecurityError')
		})

		const { result } = renderHook(() => useAutoDraw())

		expect(result.current[0]).toBe(false)
	})

	it('keeps the old setting when the storage refuses the write', () => {
		const { result } = renderHook(() => useAutoDraw())

		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new DOMException('Full', 'QuotaExceededError')
		})

		act(() => result.current[1](true))

		expect(result.current[0]).toBe(false)
	})
})
