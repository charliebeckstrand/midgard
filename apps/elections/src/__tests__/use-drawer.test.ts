// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { findElection } from '../elections/registry'
import { stateOfKey } from '../elections/us-states'
import { useDrawerGo, useDrawerStep } from '../hooks/use-drawer'

/**
 * The search of the router. `null` follows the address of the browser. A
 * string holds the router at that search, as a router transition that waits
 * for a request in flight does.
 */
const router: { search: string | null } = { search: null }

vi.mock('next/navigation', () => ({
	usePathname: () => window.location.pathname,
	useSearchParams: () => new URLSearchParams(router.search ?? window.location.search),
}))

afterEach(() => {
	cleanup()

	router.search = null
})

const midterms = findElection('2026', 'us', 'midterms')

if (midterms === undefined) throw new Error('The registry has no 2026 midterms.')

const georgia = stateOfKey('ga')

if (georgia === undefined) throw new Error('No state has the key ga.')

describe('useDrawerStep', () => {
	it('writes no history entry for a move to the current step', () => {
		window.history.replaceState(null, '', '/2026/us/midterms?region=ga&office=senate')

		const { result } = renderHook(() => useDrawerStep(midterms))

		const { step } = result.current

		if (step === null) throw new Error('The address names no step.')

		const before = window.history.length

		act(() => result.current.go({ ...step }))

		expect(window.history.length).toBe(before)

		act(() => result.current.go({ ...step, office: 'house' }))

		expect(window.history.length).toBe(before + 1)
	})

	it('opens at once while the router is behind', () => {
		window.history.replaceState(null, '', '/2026/us/midterms')

		router.search = ''

		const { result } = renderHook(() => useDrawerStep(midterms))

		expect(result.current.step).toBeNull()

		act(() => result.current.go({ region: georgia, office: null, district: null, county: null }))

		expect(result.current.step?.region).toBe(georgia)
	})

	it('closes at once while the router is behind', () => {
		window.history.replaceState(null, '', '/2026/us/midterms?region=ga&office=senate')

		router.search = 'region=ga&office=senate'

		const { result } = renderHook(() => useDrawerStep(midterms))

		expect(result.current.step?.office).toBe('senate')

		act(() => result.current.go(null))

		expect(result.current.step).toBeNull()
	})

	it('follows Back at once while the router is behind', () => {
		window.history.replaceState(null, '', '/2026/us/midterms?region=ga')

		router.search = 'region=ga'

		const { result } = renderHook(() => useDrawerStep(midterms))

		expect(result.current.step?.region.key).toBe('ga')

		act(() => {
			window.history.replaceState(null, '', '/2026/us/midterms')

			window.dispatchEvent(new PopStateEvent('popstate'))
		})

		expect(result.current.step).toBeNull()
	})

	it('moves the Drawer from a reader of the way alone, and does not render that reader again', () => {
		window.history.replaceState(null, '', '/2026/us/midterms')

		let renders = 0

		const drawer = renderHook(() => useDrawerStep(midterms))

		const opener = renderHook(() => {
			renders += 1

			return useDrawerGo(midterms)
		})

		act(() =>
			opener.result.current({ region: georgia, office: 'senate', district: null, county: null }),
		)

		expect(drawer.result.current.step?.office).toBe('senate')

		// A move to the step that shows writes no history entry.
		const before = window.history.length

		act(() =>
			opener.result.current({ region: georgia, office: 'senate', district: null, county: null }),
		)

		expect(window.history.length).toBe(before)

		expect(renders).toBe(1)
	})
})
