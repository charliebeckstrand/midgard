import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { densitySteps } from '../../core'
import { stepDown, toInnerStep, writeRootDensity } from '../../core/density'
import { slotStep } from '../../core/density/steps'
import { Density, useDensityScope, useDensityStep } from '../../primitives/density'

// A mounted reader re-renders when the root step changes, outside `act()`.
// Unmount it before the step is removed.
afterEach(() => {
	cleanup()

	writeRootDensity(document.documentElement, 'md')
})

describe('useDensityStep', () => {
	it('returns md outside each scope when the root has no step', () => {
		const { result } = renderHook(() => useDensityStep())

		expect(result.current).toBe('md')
	})

	it('returns the step on the root element outside each scope, and follows a change', async () => {
		const root = document.documentElement

		writeRootDensity(root, 'sm')

		const { result } = renderHook(() => useDensityStep())

		expect(result.current).toBe('sm')

		act(() => writeRootDensity(root, 'lg'))

		await waitFor(() => expect(result.current).toBe('lg'))
	})

	it('lets a scope win over the root step', () => {
		writeRootDensity(document.documentElement, 'sm')

		const { result } = renderHook(() => useDensityStep(), {
			wrapper: ({ children }) => <Density step="lg">{children}</Density>,
		})

		expect(result.current).toBe('lg')
	})

	it('returns the step of the nearest scope', () => {
		const { result } = renderHook(() => useDensityStep(), {
			wrapper: ({ children }) => (
				<Density step="lg">
					<Density step="xs">{children}</Density>
				</Density>
			),
		})

		expect(result.current).toBe('xs')
	})

	it('lets an explicit step win over the scope', () => {
		const { result } = renderHook(() => useDensityStep('sm'), {
			wrapper: ({ children }) => <Density step="lg">{children}</Density>,
		})

		expect(result.current).toBe('sm')
	})
})

describe('Density', () => {
	it('opens no scope without a step', () => {
		const { result } = renderHook(() => useDensityScope(), {
			wrapper: ({ children }) => <Density>{children}</Density>,
		})

		expect(result.current).toBeNull()
	})

	it('keeps the outer scope when an inner Density has no step', () => {
		const { result } = renderHook(() => useDensityStep(), {
			wrapper: ({ children }) => (
				<Density step="lg">
					<Density>{children}</Density>
				</Density>
			),
		})

		expect(result.current).toBe('lg')
	})
})

describe('toInnerStep', () => {
	it('clamps the outer steps to the inner steps', () => {
		expect(['xs', 'sm', 'md', 'lg', 'xl'].map((step) => toInnerStep(step as never))).toEqual([
			'sm',
			'sm',
			'md',
			'lg',
			'lg',
		])
	})
})

describe('stepDown', () => {
	it('takes each step one step down, and keeps xs', () => {
		expect(densitySteps.map((step) => stepDown(step))).toEqual(['xs', 'xs', 'sm', 'md', 'lg'])
	})
})

describe('slotStep', () => {
	it('takes the step below the host, which stops at lg', () => {
		expect(densitySteps.map((step) => slotStep(step))).toEqual(['xs', 'xs', 'sm', 'md', 'md'])
	})
})
