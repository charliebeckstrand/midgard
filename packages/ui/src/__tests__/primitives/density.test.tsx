import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { toAmbientStep } from '../../core'
import { Density, useDensityNullable, useDensityStep } from '../../primitives/density'

describe('useDensityStep', () => {
	it('returns md outside each scope', () => {
		const { result } = renderHook(() => useDensityStep())

		expect(result.current).toBe('md')
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
		const { result } = renderHook(() => useDensityNullable(), {
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

describe('toAmbientStep', () => {
	it('clamps the outer steps to the ambient steps', () => {
		expect(['xs', 'sm', 'md', 'lg', 'xl'].map((step) => toAmbientStep(step as never))).toEqual([
			'sm',
			'sm',
			'md',
			'lg',
			'lg',
		])
	})
})
