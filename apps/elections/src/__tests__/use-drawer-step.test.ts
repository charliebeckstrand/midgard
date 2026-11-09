// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { findElection } from '../elections/registry'
import { useDrawerStep } from '../hooks/use-drawer-step'

vi.mock('next/navigation', () => ({
	usePathname: () => window.location.pathname,
	useSearchParams: () => new URLSearchParams(window.location.search),
}))

afterEach(cleanup)

const midterms = findElection('2026', 'us', 'midterms')

if (midterms === undefined) throw new Error('The registry has no 2026 midterms.')

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
})
