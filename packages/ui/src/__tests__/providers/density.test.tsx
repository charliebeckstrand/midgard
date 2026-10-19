import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useDensityStep } from '../../primitives/density'
import { localeIntl } from '../../primitives/intl/intl-catalog'
import { DensityProvider, densityLevels, levelToStep } from '../../providers/density'
import { bySlot, renderUI } from '../helpers'

describe('levelToStep', () => {
	it('maps each friendly level to its density step', () => {
		expect(levelToStep).toEqual({ loose: 'lg', snug: 'md', compact: 'sm' })
	})
})

describe('densityLevels', () => {
	it('lists the three levels with English labels, loose → compact', () => {
		expect(densityLevels.map(({ label, value }) => ({ label, value }))).toEqual([
			{ label: 'Loose', value: 'loose' },
			{ label: 'Snug', value: 'snug' },
			{ label: 'Compact', value: 'compact' },
		])
	})

	it('names each level in the language of the reader', () => {
		const names = (locale: string) =>
			densityLevels.map((level) => localeIntl(locale).formatMessage(level.message))

		expect(names('en-US')).toEqual(['Loose', 'Snug', 'Compact'])

		expect(names('es-ES')).toEqual(['Amplia', 'Estándar', 'Compacta'])
	})
})

describe('DensityProvider context', () => {
	// The provider opens the context half of its scope at the step of its level.
	// A client reader, such as a portal root, reads that step.
	it.each([
		['compact', 'sm'],
		['snug', 'md'],
		['loose', 'lg'],
	] as const)('gives %s as the %s step', (density, step) => {
		const { result } = renderHook(() => useDensityStep(), {
			wrapper: ({ children }) => <DensityProvider density={density}>{children}</DensityProvider>,
		})

		expect(result.current).toBe(step)
	})
})

describe('DensityProvider element', () => {
	it('stamps the step onto a data-density slot', () => {
		const { container } = renderUI(<DensityProvider density="compact">content</DensityProvider>)

		expect(bySlot(container, 'density')).toHaveAttribute('data-density', 'sm')
	})

	it('opens no scope with no density, so the region keeps the outer step', () => {
		const { container } = renderUI(
			<DensityProvider density="compact">
				<DensityProvider>content</DensityProvider>
			</DensityProvider>,
		)

		const [outer, inner] = container.querySelectorAll('[data-slot="density"]')

		expect(outer).toHaveAttribute('data-density', 'sm')

		expect(inner).not.toHaveAttribute('data-density')

		const { result } = renderHook(() => useDensityStep(), {
			wrapper: ({ children }) => (
				<DensityProvider density="compact">
					<DensityProvider>{children}</DensityProvider>
				</DensityProvider>
			),
		})

		expect(result.current).toBe('sm')
	})

	it('renders the wrapper as display: contents', () => {
		const { container } = renderUI(<DensityProvider density="snug">content</DensityProvider>)

		expect(bySlot(container, 'density')?.className).toBe('contents')
	})
})
