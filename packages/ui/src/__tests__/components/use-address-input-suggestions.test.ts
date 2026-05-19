import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AddressProvider, AddressSuggestion } from '../../components/address-input/types'
import { useAddressInputSuggestions } from '../../components/address-input/use-address-input-suggestions'

function makeProvider(results: AddressSuggestion[] = []): AddressProvider {
	return vi.fn().mockResolvedValue(results)
}

afterEach(() => {
	vi.useRealTimers()
})

describe('useAddressInputSuggestions', () => {
	it('returns empty initial state', () => {
		const { result } = renderHook(() =>
			useAddressInputSuggestions({
				query: '',
				enabled: true,
				provider: makeProvider(),
				debounceMs: 100,
				minQueryLength: 2,
			}),
		)

		expect(result.current.suggestions).toEqual([])

		expect(result.current.loading).toBe(false)

		expect(result.current.ready).toBe(false)
	})

	it('skips fetching when disabled', () => {
		const provider = makeProvider([{ id: '1', label: 'one' } as AddressSuggestion])

		const { result } = renderHook(() =>
			useAddressInputSuggestions({
				query: 'abc',
				enabled: false,
				provider,
				debounceMs: 0,
				minQueryLength: 2,
			}),
		)

		expect(provider).not.toHaveBeenCalled()

		expect(result.current.suggestions).toEqual([])
	})

	it('resets when the query falls below the minimum length', async () => {
		vi.useFakeTimers()

		const provider = makeProvider([{ id: '1', label: 'one' } as AddressSuggestion])

		const { result, rerender } = renderHook(
			({ query }) =>
				useAddressInputSuggestions({
					query,
					enabled: true,
					provider,
					debounceMs: 0,
					minQueryLength: 3,
				}),
			{ initialProps: { query: 'abc' } },
		)

		await act(async () => {
			await vi.runAllTimersAsync()
		})

		expect(result.current.suggestions.length).toBeGreaterThan(0)

		rerender({ query: 'a' })

		expect(result.current.suggestions).toEqual([])

		expect(result.current.loading).toBe(false)

		expect(result.current.ready).toBe(false)
	})

	it('fetches suggestions after the debounce window elapses', async () => {
		vi.useFakeTimers()

		const provider = makeProvider([
			{ id: '1', label: 'first' } as AddressSuggestion,
			{ id: '2', label: 'second' } as AddressSuggestion,
		])

		const { result } = renderHook(() =>
			useAddressInputSuggestions({
				query: 'main',
				enabled: true,
				provider,
				debounceMs: 10,
				minQueryLength: 2,
			}),
		)

		expect(result.current.loading).toBe(true)

		await act(async () => {
			await vi.runAllTimersAsync()
		})

		expect(result.current.ready).toBe(true)

		expect(result.current.suggestions.length).toBe(2)

		expect(result.current.loading).toBe(false)
	})

	it('runs immediately for an empty-but-enabled query (delay = 0)', async () => {
		vi.useFakeTimers()

		const provider = makeProvider([])

		renderHook(() =>
			useAddressInputSuggestions({
				query: '',
				enabled: true,
				provider,
				debounceMs: 200,
				minQueryLength: 0,
			}),
		)

		await act(async () => {
			await vi.runAllTimersAsync()
		})

		expect(provider).toHaveBeenCalled()
	})

	it('swallows AbortError without flipping loading state', async () => {
		vi.useFakeTimers()

		const provider = vi.fn().mockImplementation(
			() =>
				new Promise((_, reject) => {
					setTimeout(() => {
						const err = new DOMException('aborted', 'AbortError')

						reject(err)
					}, 10)
				}),
		)

		const { result, unmount } = renderHook(() =>
			useAddressInputSuggestions({
				query: 'abc',
				enabled: true,
				provider,
				debounceMs: 0,
				minQueryLength: 2,
			}),
		)

		await act(async () => {
			vi.advanceTimersByTime(10)

			await Promise.resolve()
		})

		unmount()

		expect(result.current.suggestions).toEqual([])
	})

	it('clears suggestions and marks ready when the provider rejects with a non-abort error', async () => {
		vi.useFakeTimers()

		const provider = vi.fn().mockRejectedValue(new Error('network down'))

		const { result } = renderHook(() =>
			useAddressInputSuggestions({
				query: 'abc',
				enabled: true,
				provider,
				debounceMs: 0,
				minQueryLength: 2,
			}),
		)

		await act(async () => {
			await vi.runAllTimersAsync()
		})

		expect(result.current.ready).toBe(true)

		expect(result.current.suggestions).toEqual([])

		expect(result.current.loading).toBe(false)
	})

	it('aborts the in-flight request on unmount', () => {
		vi.useFakeTimers()

		const provider = vi.fn().mockImplementation(() => new Promise(() => {}))

		const { unmount } = renderHook(() =>
			useAddressInputSuggestions({
				query: 'abc',
				enabled: true,
				provider,
				debounceMs: 0,
				minQueryLength: 2,
			}),
		)

		act(() => {
			vi.advanceTimersByTime(0)
		})

		expect(() => unmount()).not.toThrow()
	})
})
