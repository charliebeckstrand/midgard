import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AddressProvider } from '../../components/address-input/types'
import { useAddressInputSuggestions } from '../../components/address-input/use-address-input-suggestions'

describe('useAddressInputSuggestions guards', () => {
	it('does not fetch a query of white space only, however long', async () => {
		vi.useFakeTimers()

		const provider: AddressProvider = vi.fn().mockResolvedValue([])

		const { result } = renderHook(() =>
			useAddressInputSuggestions({
				query: '   ',
				enabled: true,
				provider,
				debounceMs: 0,
				minQueryLength: 3,
			}),
		)

		await act(async () => {
			await vi.runAllTimersAsync()
		})

		expect(provider).not.toHaveBeenCalled()

		expect(result.current.loading).toBe(false)
	})

	it('counts only the characters inside the leading and trailing white space', async () => {
		vi.useFakeTimers()

		const provider: AddressProvider = vi.fn().mockResolvedValue([])

		renderHook(() =>
			useAddressInputSuggestions({
				query: '  ab  ',
				enabled: true,
				provider,
				debounceMs: 0,
				minQueryLength: 3,
			}),
		)

		await act(async () => {
			await vi.runAllTimersAsync()
		})

		expect(provider).not.toHaveBeenCalled()
	})

	it('passes the query as typed once the trimmed length reaches the minimum', async () => {
		vi.useFakeTimers()

		const provider: AddressProvider = vi.fn().mockResolvedValue([])

		renderHook(() =>
			useAddressInputSuggestions({
				query: ' abc ',
				enabled: true,
				provider,
				debounceMs: 0,
				minQueryLength: 3,
			}),
		)

		await act(async () => {
			await vi.runAllTimersAsync()
		})

		expect(provider).toHaveBeenCalledWith(' abc ', expect.anything())
	})

	it('still fetches an empty query when the minimum is zero', async () => {
		vi.useFakeTimers()

		const provider: AddressProvider = vi.fn().mockResolvedValue([])

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
			await vi.advanceTimersByTimeAsync(0)
		})

		expect(provider).toHaveBeenCalledWith('', expect.anything())
	})

	it('treats a provider that throws synchronously as a rejection', async () => {
		vi.useFakeTimers()

		const error = new Error('bad config')

		const provider: AddressProvider = vi.fn(() => {
			throw error
		})

		const onError = vi.fn()

		const { result } = renderHook(() =>
			useAddressInputSuggestions({
				query: 'abc',
				enabled: true,
				provider,
				debounceMs: 0,
				minQueryLength: 3,
				onError,
			}),
		)

		// A throw that escapes the debounce timer is the defect, so it is caught
		// here and the assertions below report it.
		let escaped: unknown

		await act(async () => {
			try {
				await vi.runAllTimersAsync()
			} catch (thrown) {
				escaped = thrown
			}
		})

		expect(escaped).toBeUndefined()

		expect(onError).toHaveBeenCalledWith(error)

		expect(result.current.loading).toBe(false)

		expect(result.current.ready).toBe(true)

		expect(result.current.suggestions).toEqual([])
	})
})
