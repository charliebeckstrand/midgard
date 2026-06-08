import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Density, DensityScope, densityPresets, useDensity } from '../../primitives/density'

describe('useDensity (no ancestor)', () => {
	it('returns the md preset outside any provider', () => {
		const { result } = renderHook(() => useDensity())

		expect(result.current).toEqual(densityPresets.md)
	})
})

describe('Density component', () => {
	it('scale="lg" resolves both axes to lg', () => {
		const { result } = renderHook(() => useDensity(), {
			wrapper: ({ children }) => <Density scale="lg">{children}</Density>,
		})

		expect(result.current).toEqual({ space: 'lg', size: 'lg' })
	})

	it('space="sm" overrides only the space axis (size inherits)', () => {
		const { result } = renderHook(() => useDensity(), {
			wrapper: ({ children }) => (
				<Density scale="lg">
					<Density space="sm">{children}</Density>
				</Density>
			),
		})

		expect(result.current).toEqual({ space: 'sm', size: 'lg' })
	})

	it('size="lg" overrides only the size axis (space inherits)', () => {
		const { result } = renderHook(() => useDensity(), {
			wrapper: ({ children }) => (
				<Density scale="sm">
					<Density size="lg">{children}</Density>
				</Density>
			),
		})

		expect(result.current).toEqual({ space: 'sm', size: 'lg' })
	})

	it('explicit axes win over scale shorthand at the same site', () => {
		const { result } = renderHook(() => useDensity(), {
			wrapper: ({ children }) => (
				<Density scale="lg" size="sm">
					{children}
				</Density>
			),
		})

		expect(result.current).toEqual({ space: 'lg', size: 'sm' })
	})

	it('inner Density without scale inherits both axes from parent', () => {
		const { result } = renderHook(() => useDensity(), {
			wrapper: ({ children }) => (
				<Density scale="lg">
					<Density>{children}</Density>
				</Density>
			),
		})

		expect(result.current).toEqual({ space: 'lg', size: 'lg' })
	})

	it('nested per-axis overrides compose innermost-wins per axis', () => {
		const { result } = renderHook(() => useDensity(), {
			wrapper: ({ children }) => (
				<Density space="lg">
					<Density size="sm">
						<Density space="md">{children}</Density>
					</Density>
				</Density>
			),
		})

		expect(result.current).toEqual({ space: 'md', size: 'sm' })
	})
})

describe('DensityScope', () => {
	it('renders a Density when scale is provided', () => {
		const { result } = renderHook(() => useDensity(), {
			wrapper: ({ children }) => <DensityScope scale="lg">{children}</DensityScope>,
		})

		expect(result.current).toEqual({ space: 'lg', size: 'lg' })
	})

	it('is a no-op when scale is undefined (no provider written)', () => {
		const { result } = renderHook(() => useDensity(), {
			wrapper: ({ children }) => <DensityScope>{children}</DensityScope>,
		})

		expect(result.current).toEqual(densityPresets.md)
	})
})
