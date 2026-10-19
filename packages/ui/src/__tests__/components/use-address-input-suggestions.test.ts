import { act, renderHook } from '@testing-library/react'
import { describe, expect, vi } from 'vitest'
import type { AddressProvider, AddressSuggestion } from '../../components/address-input/types'
import { useAddressInputSuggestions } from '../../components/address-input/use-address-input-suggestions'
import { it } from '../helpers/fake-clock'

function makeProvider(results: AddressSuggestion[] = []): AddressProvider {
	return vi.fn().mockResolvedValue(results)
}

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

	it('resets when the query falls below the minimum length', async ({ clock }) => {
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

		await clock.runAll()

		expect(result.current.suggestions.length).toBeGreaterThan(0)

		rerender({ query: 'a' })

		expect(result.current.suggestions).toEqual([])

		expect(result.current.loading).toBe(false)

		expect(result.current.ready).toBe(false)
	})

	it('fetches suggestions after the debounce window elapses', async ({ clock }) => {
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

		await clock.runAll()

		expect(result.current.ready).toBe(true)

		expect(result.current.suggestions.length).toBe(2)

		expect(result.current.loading).toBe(false)
	})

	it('runs immediately for an empty-but-enabled query (delay = 0)', async ({ clock }) => {
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

		// Zero, not every pending timer: running them all fires the 200ms debounce
		// too, so the case passed whatever the delay was.
		await clock.advance(0)

		expect(provider).toHaveBeenCalled()
	})

	it('swallows AbortError without flipping loading state', async ({ clock }) => {
		const provider = vi.fn().mockImplementation(
			() =>
				new Promise((_, reject) => {
					setTimeout(() => {
						const error = new DOMException('aborted', 'AbortError')

						reject(error)
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
			await clock.advance(10)

			await Promise.resolve()
		})

		unmount()

		expect(result.current.suggestions).toEqual([])

		expect(result.current.loading).toBe(true)

		expect(result.current.ready).toBe(false)
	})

	it('clears suggestions and marks ready when the provider rejects with a non-abort error', async ({
		clock,
	}) => {
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

		await clock.runAll()

		expect(result.current.ready).toBe(true)

		expect(result.current.suggestions).toEqual([])

		expect(result.current.loading).toBe(false)
	})

	it('aborts the in-flight request on unmount', async ({ clock }) => {
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

		await clock.advance(0)

		expect(() => unmount()).not.toThrow()
	})
})
