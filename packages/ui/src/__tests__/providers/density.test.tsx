import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useDensity } from '../../primitives/density'
import { Density, densityLevels, densityToSize } from '../../providers/density'
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

describe('Density provider broadcast', () => {
	// The friendly provider lights up the primitive Density token diagonally
	// (both axes equal) so every size-aware descendant inherits without wiring.
	it('broadcasts compact as the sm token on both axes', () => {
		const { result } = renderHook(() => useDensity(), {
			wrapper: ({ children }) => <Density density="compact">{children}</Density>,
		})

		expect(result.current).toEqual({ density: 'sm', size: 'sm' })
	})

	it('broadcasts snug as the md token on both axes', () => {
		const { result } = renderHook(() => useDensity(), {
			wrapper: ({ children }) => <Density density="snug">{children}</Density>,
		})

		expect(result.current).toEqual({ density: 'md', size: 'md' })
	})

	it('broadcasts loose as the lg token on both axes', () => {
		const { result } = renderHook(() => useDensity(), {
			wrapper: ({ children }) => <Density density="loose">{children}</Density>,
		})

		expect(result.current).toEqual({ density: 'lg', size: 'lg' })
	})
})

describe('Density provider element', () => {
	it('stamps the level onto a data-density slot', () => {
		const { container } = renderUI(<Density density="compact">content</Density>)

		expect(bySlot(container, 'density')).toHaveAttribute('data-density', 'compact')
	})

	it('defaults the wrapper to display: contents', () => {
		const { container } = renderUI(<Density density="snug">content</Density>)

		expect(bySlot(container, 'density')?.className).toBe('contents')
	})

	it('accepts a className override on the wrapper', () => {
		const { container } = renderUI(
			<Density density="snug" className="custom">
				content
			</Density>,
		)

		expect(bySlot(container, 'density')?.className).toBe('custom')
	})
})
