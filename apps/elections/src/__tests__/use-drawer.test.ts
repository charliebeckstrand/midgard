// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Election } from '../elections/registry'
import type { UsState } from '../elections/us-states'

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

let useDrawerGo: typeof import('../hooks/use-drawer').useDrawerGo

let useDrawerStep: typeof import('../hooks/use-drawer').useDrawerStep

let midterms: Election

let georgia: UsState

// The Drawer keeps the record of its history entries, and the address keeps
// the path that leads the router, in module scope. A case that opens the
// Drawer leaves them for the next case, so the result of a case changed with
// the order of the cases. Each case loads the modules again, so it starts with
// no record. The registry and the states load with them, so a step that the
// hook reads holds the same state object as the case.
beforeEach(async () => {
	vi.resetModules()

	const [drawer, registry, states] = await Promise.all([
		import('../hooks/use-drawer'),
		import('../elections/registry'),
		import('../elections/us-states'),
	])

	useDrawerGo = drawer.useDrawerGo

	useDrawerStep = drawer.useDrawerStep

	const election = registry.findElection('2026', 'us', 'midterms')

	if (election === undefined) throw new Error('The registry has no 2026 midterms.')

	const state = states.stateOfKey('ga')

	if (state === undefined) throw new Error('No state has the key ga.')

	midterms = election

	georgia = state
})

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

		act(() =>
			result.current.go({
				region: georgia,
				office: null,
				district: null,
				view: 'overview',
				county: null,
			}),
		)

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

	it('writes a replace over the entry, and a close still leaves to the page', () => {
		window.history.replaceState(null, '', '/2026/us/midterms')

		const { result } = renderHook(() => useDrawerStep(midterms))

		const race = {
			region: georgia,
			office: 'senate',
			district: null,
			view: 'overview',
			county: null,
		} as const

		act(() => result.current.go(race))

		const before = window.history.length

		act(() => result.current.go({ ...race, view: 'counties' }, 'replace'))

		expect(window.history.length).toBe(before)
		expect(result.current.step?.view).toBe('counties')

		const back = vi.spyOn(window.history, 'go').mockImplementation(() => undefined)

		act(() => result.current.go(null))

		// The close goes back one entry, to the page from before the open.
		expect(back).toHaveBeenCalledWith(-1)

		back.mockRestore()
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
			opener.result.current({
				region: georgia,
				office: 'senate',
				district: null,
				view: 'overview',
				county: null,
			}),
		)

		expect(drawer.result.current.step?.office).toBe('senate')

		// A move to the step that shows writes no history entry.
		const before = window.history.length

		act(() =>
			opener.result.current({
				region: georgia,
				office: 'senate',
				district: null,
				view: 'overview',
				county: null,
			}),
		)

		expect(window.history.length).toBe(before)

		expect(renders).toBe(1)
	})
})
