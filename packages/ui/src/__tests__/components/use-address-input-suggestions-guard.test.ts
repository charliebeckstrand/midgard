import { renderHook } from '@testing-library/react'
import { describe, expect, vi } from 'vitest'
import type { AddressProvider } from '../../components/address-input/types'
import { useAddressInputSuggestions } from '../../components/address-input/use-address-input-suggestions'
import { it } from '../helpers/fake-clock'

type Options = Parameters<typeof useAddressInputSuggestions>[0]

/**
 * Renders the hook for an enabled query with no debounce and a minimum length
 * of 3. The fields of `options` replace these values.
 */
function renderSuggestions(options: Partial<Options> & Pick<Options, 'query' | 'provider'>) {
	return renderHook(() =>
		useAddressInputSuggestions({ enabled: true, debounceMs: 0, minQueryLength: 3, ...options }),
	)
}

describe('useAddressInputSuggestions guards', () => {
	it('does not fetch a query of white space only, however long', async ({ clock }) => {
		const provider: AddressProvider = vi.fn().mockResolvedValue([])

		const { result } = renderSuggestions({ query: '   ', provider })

		await clock.runAll()

		expect(provider).not.toHaveBeenCalled()

		expect(result.current.loading).toBe(false)
	})

	it('counts only the characters inside the leading and trailing white space', async ({
		clock,
	}) => {
		const provider: AddressProvider = vi.fn().mockResolvedValue([])

		renderSuggestions({ query: '  ab  ', provider })

		await clock.runAll()

		expect(provider).not.toHaveBeenCalled()
	})

	it('passes the query as typed once the trimmed length reaches the minimum', async ({ clock }) => {
		const provider: AddressProvider = vi.fn().mockResolvedValue([])

		renderSuggestions({ query: ' abc ', provider })

		await clock.runAll()

		expect(provider).toHaveBeenCalledWith(' abc ', expect.anything())
	})

	it('still fetches an empty query when the minimum is zero', async ({ clock }) => {
		const provider: AddressProvider = vi.fn().mockResolvedValue([])

		renderSuggestions({ query: '', provider, debounceMs: 200, minQueryLength: 0 })

		// Zero, not every pending timer: running them all fires the 200ms debounce
		// too, so the case passed whatever the delay was.
		await clock.advance(0)

		expect(provider).toHaveBeenCalledWith('', expect.anything())
	})

	it('treats a provider that throws synchronously as a rejection', async ({ clock }) => {
		const error = new Error('bad config')

		const provider: AddressProvider = vi.fn(() => {
			throw error
		})

		const onError = vi.fn()

		const { result } = renderSuggestions({ query: 'abc', provider, onError })

		// A throw that escapes the debounce timer is the defect, so it is caught
		// here and the assertions below report it.
		const escaped = await clock.runAll().then(
			() => undefined,
			(thrown: unknown) => thrown,
		)

		expect(escaped).toBeUndefined()

		expect(onError).toHaveBeenCalledWith(error)

		expect(result.current.loading).toBe(false)

		expect(result.current.ready).toBe(true)

		expect(result.current.suggestions).toEqual([])
	})
})
