import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AffixProvider, useAffix } from '../../primitives/affix'
import { DENSITY_PRESETS, Density, useWideSize } from '../../primitives/density'

describe('useAffix', () => {
	it('returns null outside any AffixProvider', () => {
		const { result } = renderHook(() => useAffix())

		expect(result.current).toBeNull()
	})

	it('returns the broadcast Ma value when wrapped', () => {
		const { result } = renderHook(() => useAffix(), {
			wrapper: ({ children }) => <AffixProvider value="xs">{children}</AffixProvider>,
		})

		expect(result.current).toBe('xs')
	})

	it('innermost AffixProvider wins', () => {
		const { result } = renderHook(() => useAffix(), {
			wrapper: ({ children }) => (
				<AffixProvider value="md">
					<AffixProvider value="xs">{children}</AffixProvider>
				</AffixProvider>
			),
		})

		expect(result.current).toBe('xs')
	})
})

describe('useWideSize', () => {
	it('returns the explicit value when provided', () => {
		const { result } = renderHook(() => useWideSize('xl'))

		expect(result.current).toBe('xl')
	})

	it('falls through to Affix when no explicit value', () => {
		const { result } = renderHook(() => useWideSize(), {
			wrapper: ({ children }) => <AffixProvider value="xs">{children}</AffixProvider>,
		})

		expect(result.current).toBe('xs')
	})

	it('falls through to Density size when no Affix', () => {
		const { result } = renderHook(() => useWideSize(), {
			wrapper: ({ children }) => <Density size="lg">{children}</Density>,
		})

		expect(result.current).toBe('lg')
	})

	it('returns md when nothing is in scope', () => {
		const { result } = renderHook(() => useWideSize())

		expect(result.current).toBe(DENSITY_PRESETS.md.size)
	})

	it('Affix wins over an enclosing Density', () => {
		const { result } = renderHook(() => useWideSize(), {
			wrapper: ({ children }) => (
				<Density size="lg">
					<AffixProvider value="xs">{children}</AffixProvider>
				</Density>
			),
		})

		expect(result.current).toBe('xs')
	})

	it('explicit prop wins over Affix', () => {
		const { result } = renderHook(() => useWideSize('xl'), {
			wrapper: ({ children }) => <AffixProvider value="xs">{children}</AffixProvider>,
		})

		expect(result.current).toBe('xl')
	})
})
