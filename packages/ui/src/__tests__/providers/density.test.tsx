import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useDensity } from '../../primitives/density'
import { DensityProvider, densityLevels, densityToSize } from '../../providers/density'
import { bySlot, renderUI } from '../helpers'

describe('densityToSize', () => {
	it('maps the friendly levels 1:1 onto the Step cascade', () => {
		expect(densityToSize).toEqual({ loose: 'lg', snug: 'md', compact: 'sm' })
	})
})

describe('densityLevels', () => {
	it('lists the three levels with display labels, loose → compact', () => {
		expect(densityLevels).toEqual([
			{ label: 'Loose', value: 'loose' },
			{ label: 'Snug', value: 'snug' },
			{ label: 'Compact', value: 'compact' },
		])
	})
})

describe('DensityProvider broadcast', () => {
	// Sets both Density axes to the same token; size-aware descendants inherit
	// without additional wiring.
	it('broadcasts compact as the sm token on both axes', () => {
		const { result } = renderHook(() => useDensity(), {
			wrapper: ({ children }) => <DensityProvider density="compact">{children}</DensityProvider>,
		})

		expect(result.current).toEqual({ space: 'sm', size: 'sm' })
	})

	it('broadcasts snug as the md token on both axes', () => {
		const { result } = renderHook(() => useDensity(), {
			wrapper: ({ children }) => <DensityProvider density="snug">{children}</DensityProvider>,
		})

		expect(result.current).toEqual({ space: 'md', size: 'md' })
	})

	it('broadcasts loose as the lg token on both axes', () => {
		const { result } = renderHook(() => useDensity(), {
			wrapper: ({ children }) => <DensityProvider density="loose">{children}</DensityProvider>,
		})

		expect(result.current).toEqual({ space: 'lg', size: 'lg' })
	})
})

describe('DensityProvider element', () => {
	it('stamps the level onto a data-density slot', () => {
		const { container } = renderUI(<DensityProvider density="compact">content</DensityProvider>)

		expect(bySlot(container, 'density')).toHaveAttribute('data-density', 'compact')
	})

	it('defaults the wrapper to display: contents', () => {
		const { container } = renderUI(<DensityProvider density="snug">content</DensityProvider>)

		expect(bySlot(container, 'density')?.className).toBe('contents')
	})

	it('accepts a className override on the wrapper', () => {
		const { container } = renderUI(
			<DensityProvider density="snug" className="custom">
				content
			</DensityProvider>,
		)

		expect(bySlot(container, 'density')?.className).toBe('custom')
	})
})
