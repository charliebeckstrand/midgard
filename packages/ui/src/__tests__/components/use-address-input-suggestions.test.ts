import { act, renderHook } from '@testing-library/react'
import { describe, expect, vi } from 'vitest'
import type { AddressProvider, AddressSuggestion } from '../../components/address-input/types'
import { useAddressInputSuggestions } from '../../components/address-input/use-address-input-suggestions'
import { it } from '../helpers/fake-clock'

type Options = Parameters<typeof useAddressInputSuggestions>[0]

function makeProvider(results: AddressSuggestion[] = []): AddressProvider {
	return vi.fn().mockResolvedValue(results)
}

/**
 * Renders the hook for an enabled `'abc'` query with no debounce and a
 * minimum length of 2. The fields of `options` replace these values, and the
 * props of a `rerender` replace both.
 */
function renderSuggestions(options: Partial<Options> = {}) {
	const base: Options = {
		query: 'abc',
		enabled: true,
		provider: makeProvider(),
		debounceMs: 0,
		minQueryLength: 2,
		...options,
	}

	return renderHook(
		(props: Partial<Options>) => useAddressInputSuggestions({ ...base, ...props }),
		{
			initialProps: {},
		},
	)
}

describe('useAddressInputSuggestions', () => {
	it('returns empty initial state', () => {
		const { result } = renderSuggestions({ query: '', debounceMs: 100 })

		expect(result.current.suggestions).toEqual([])

		expect(result.current.loading).toBe(false)

		expect(result.current.ready).toBe(false)
	})

	it('skips fetching when disabled', async ({ clock }) => {
		const provider = makeProvider([{ id: '1', label: 'one' } as AddressSuggestion])

		const { result } = renderSuggestions({ enabled: false, provider })

		// The fetch waits on a timer, so the timers run before the assertions.
		await clock.runAll()

		expect(provider).not.toHaveBeenCalled()

		expect(result.current.suggestions).toEqual([])
	})

	it('resets when the query falls below the minimum length', async ({ clock }) => {
		const provider = makeProvider([{ id: '1', label: 'one' } as AddressSuggestion])

		const { result, rerender } = renderSuggestions({ provider, minQueryLength: 3 })

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

		const { result } = renderSuggestions({ query: 'main', provider, debounceMs: 10 })

		expect(result.current.loading).toBe(true)

		await clock.runAll()

		expect(result.current.ready).toBe(true)

		expect(result.current.suggestions.length).toBe(2)

		expect(result.current.loading).toBe(false)
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

		const { result, unmount } = renderSuggestions({ provider })

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

		const { result } = renderSuggestions({ provider })

		await clock.runAll()

		expect(result.current.ready).toBe(true)

		expect(result.current.suggestions).toEqual([])

		expect(result.current.loading).toBe(false)
	})

	it('aborts the in-flight request on unmount', async ({ clock }) => {
		const provider = vi.fn<AddressProvider>().mockImplementation(() => new Promise(() => {}))

		const { unmount } = renderSuggestions({ provider })

		await clock.advance(0)

		const signal = provider.mock.calls[0]?.[1].signal

		expect(signal?.aborted).toBe(false)

		unmount()

		expect(signal?.aborted).toBe(true)
	})
})
