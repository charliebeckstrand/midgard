import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useDensityStep } from '../../primitives/density'
import { DensityProvider, densityLevels, levelToStep } from '../../providers/density'
import { bySlot, renderUI } from '../helpers'

describe('levelToStep', () => {
	it('maps each friendly level to its density step', () => {
		expect(levelToStep).toEqual({ loose: 'lg', snug: 'md', compact: 'sm' })
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

describe('DensityProvider context', () => {
	// The provider opens the context half of its scope at the step of its level.
	// A client reader, such as a portal root, reads that step.
	it('gives compact as the sm step', () => {
		const { result } = renderHook(() => useDensityStep(), {
			wrapper: ({ children }) => <DensityProvider density="compact">{children}</DensityProvider>,
		})

		expect(result.current).toBe('sm')
	})

	it('gives snug as the md step', () => {
		const { result } = renderHook(() => useDensityStep(), {
			wrapper: ({ children }) => <DensityProvider density="snug">{children}</DensityProvider>,
		})

		expect(result.current).toBe('md')
	})

	it('gives loose as the lg step', () => {
		const { result } = renderHook(() => useDensityStep(), {
			wrapper: ({ children }) => <DensityProvider density="loose">{children}</DensityProvider>,
		})

		expect(result.current).toBe('lg')
	})
})

describe('DensityProvider element', () => {
	it('stamps the step onto a data-density slot', () => {
		const { container } = renderUI(<DensityProvider density="compact">content</DensityProvider>)

		expect(bySlot(container, 'density')).toHaveAttribute('data-density', 'sm')
	})

	it('renders the wrapper as display: contents', () => {
		const { container } = renderUI(<DensityProvider density="snug">content</DensityProvider>)

		expect(bySlot(container, 'density')?.className).toBe('contents')
	})
})
