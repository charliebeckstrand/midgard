import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ConcentricProvider, useConcentric } from '../../primitives/concentric'
import {
	DENSITY_PRESETS,
	Density,
	DensityScope,
	stepDown,
	useDensity,
} from '../../primitives/density'

describe('stepDown', () => {
	it('steps md → sm', () => {
		expect(stepDown('md')).toBe('sm')
	})

	it('steps lg → md', () => {
		expect(stepDown('lg')).toBe('md')
	})

	it('clamps at sm (no underflow)', () => {
		expect(stepDown('sm')).toBe('sm')
	})
})

describe('useDensity (no ancestor)', () => {
	it('returns the md preset outside any provider', () => {
		const { result } = renderHook(() => useDensity())

		expect(result.current).toEqual(DENSITY_PRESETS.md)
	})
})

describe('Density component', () => {
	it('scale="lg" resolves both axes to lg', () => {
		const { result } = renderHook(() => useDensity(), {
			wrapper: ({ children }) => <Density scale="lg">{children}</Density>,
		})

		expect(result.current).toEqual({ density: 'lg', size: 'lg' })
	})

	it('density="sm" overrides only the density axis (size inherits)', () => {
		const { result } = renderHook(() => useDensity(), {
			wrapper: ({ children }) => (
				<Density scale="lg">
					<Density density="sm">{children}</Density>
				</Density>
			),
		})

		expect(result.current).toEqual({ density: 'sm', size: 'lg' })
	})

	it('size="lg" overrides only the size axis (density inherits)', () => {
		const { result } = renderHook(() => useDensity(), {
			wrapper: ({ children }) => (
				<Density scale="sm">
					<Density size="lg">{children}</Density>
				</Density>
			),
		})

		expect(result.current).toEqual({ density: 'sm', size: 'lg' })
	})

	it('explicit axes win over scale shorthand at the same site', () => {
		const { result } = renderHook(() => useDensity(), {
			wrapper: ({ children }) => (
				<Density scale="lg" size="sm">
					{children}
				</Density>
			),
		})

		expect(result.current).toEqual({ density: 'lg', size: 'sm' })
	})

	it('inner Density without scale inherits both axes from parent', () => {
		const { result } = renderHook(() => useDensity(), {
			wrapper: ({ children }) => (
				<Density scale="lg">
					<Density>{children}</Density>
				</Density>
			),
		})

		expect(result.current).toEqual({ density: 'lg', size: 'lg' })
	})

	it('nested per-axis overrides compose innermost-wins per axis', () => {
		const { result } = renderHook(() => useDensity(), {
			wrapper: ({ children }) => (
				<Density density="lg">
					<Density size="sm">
						<Density density="md">{children}</Density>
					</Density>
				</Density>
			),
		})

		expect(result.current).toEqual({ density: 'md', size: 'sm' })
	})
})

describe('DensityScope', () => {
	it('renders a Density when scale is provided', () => {
		const { result } = renderHook(() => useDensity(), {
			wrapper: ({ children }) => <DensityScope scale="lg">{children}</DensityScope>,
		})

		expect(result.current).toEqual({ density: 'lg', size: 'lg' })
	})

	it('is a no-op when scale is undefined (no provider written)', () => {
		const { result } = renderHook(() => useDensity(), {
			wrapper: ({ children }) => <DensityScope>{children}</DensityScope>,
		})

		expect(result.current).toEqual(DENSITY_PRESETS.md)
	})
})

describe('Concentric bridge (legacy interop)', () => {
	it('Density writes a matching ConcentricProvider for unmigrated consumers', () => {
		const { result } = renderHook(() => useConcentric(), {
			wrapper: ({ children }) => <Density scale="lg">{children}</Density>,
		})

		expect(result.current).toEqual({ size: 'lg' })
	})

	it('useDensity projects from a legacy Concentric ancestor when no Density exists', () => {
		const { result } = renderHook(() => useDensity(), {
			wrapper: ({ children }) => (
				<ConcentricProvider value={{ size: 'sm' }}>{children}</ConcentricProvider>
			),
		})

		expect(result.current).toEqual({ density: 'sm', size: 'sm' })
	})

	it('useDensity falls back to md when Concentric carries a wider value (xs / xl)', () => {
		const { result } = renderHook(() => useDensity(), {
			wrapper: ({ children }) => (
				<ConcentricProvider value={{ size: 'xs' }}>{children}</ConcentricProvider>
			),
		})

		expect(result.current).toEqual(DENSITY_PRESETS.md)
	})

	it('Density wins over an enclosing Concentric (new system authoritative)', () => {
		const { result } = renderHook(() => useDensity(), {
			wrapper: ({ children }) => (
				<ConcentricProvider value={{ size: 'sm' }}>
					<Density size="lg">{children}</Density>
				</ConcentricProvider>
			),
		})

		expect(result.current).toEqual({ density: 'sm', size: 'lg' })
	})

	it('Density inherits the density axis from a legacy Concentric ancestor', () => {
		// Concentric ancestor carries `lg`; a Density with size override should
		// still inherit `density: 'lg'` from the projected Concentric.
		const { result } = renderHook(() => useDensity(), {
			wrapper: ({ children }) => (
				<ConcentricProvider value={{ size: 'lg' }}>
					<Density size="sm">{children}</Density>
				</ConcentricProvider>
			),
		})

		expect(result.current).toEqual({ density: 'lg', size: 'sm' })
	})
})
