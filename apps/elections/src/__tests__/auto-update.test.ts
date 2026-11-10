// @vitest-environment jsdom
import { act, cleanup, render, renderHook } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AutoUpdateRefresh } from '../components/auto-update'
import { setAutoUpdate, useAutoUpdate } from '../hooks/use-auto-update'

const refresh = vi.fn()

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

beforeEach(() => {
	localStorage.clear()

	refresh.mockClear()

	// The server runs the build of the page, so each check before a refresh passes.
	vi.stubGlobal(
		'fetch',
		vi.fn(async () => new Response('build-a')),
	)
})

afterEach(() => {
	cleanup()

	vi.useRealTimers()
})

describe('useAutoUpdate', () => {
	it('is on by default', () => {
		const { result } = renderHook(() => useAutoUpdate())

		expect(result.current).toBe(true)
	})

	it('keeps the setting in localStorage and renders each reader again', () => {
		const { result } = renderHook(() => useAutoUpdate())

		act(() => setAutoUpdate(false))

		expect(result.current).toBe(false)

		expect(localStorage.getItem('elections:auto-update')).toBe('0')

		act(() => setAutoUpdate(true))

		expect(result.current).toBe(true)

		expect(localStorage.getItem('elections:auto-update')).toBeNull()
	})

	it('follows a change in another tab', () => {
		const { result } = renderHook(() => useAutoUpdate())

		// Another tab writes the storage, and this tab gets only the event.
		localStorage.setItem('elections:auto-update', '0')

		act(() => {
			window.dispatchEvent(new StorageEvent('storage', { key: 'elections:auto-update' }))
		})

		expect(result.current).toBe(false)
	})
})

describe('AutoUpdateRefresh', () => {
	it('renders the page again each minute while the setting is on', async () => {
		vi.useFakeTimers()

		render(createElement(AutoUpdateRefresh, { live: true }))

		await act(() => vi.advanceTimersByTimeAsync(60_000))

		expect(refresh).toHaveBeenCalledTimes(1)
	})

	it('stops when the setting goes off', async () => {
		vi.useFakeTimers()

		render(createElement(AutoUpdateRefresh, { live: true }))

		act(() => setAutoUpdate(false))

		await act(() => vi.advanceTimersByTimeAsync(120_000))

		expect(refresh).not.toHaveBeenCalled()
	})

	it('does not refresh a page whose votes are all counted', async () => {
		vi.useFakeTimers()

		render(createElement(AutoUpdateRefresh, { live: false }))

		await act(() => vi.advanceTimersByTimeAsync(120_000))

		expect(refresh).not.toHaveBeenCalled()
	})
})
