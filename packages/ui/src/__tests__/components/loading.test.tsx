import { describe, expect, it } from 'vitest'
import { LoadingDots, LoadingSpinner } from '../../components/loading'
import { bySlot, renderUI, screen } from '../helpers'

describe.each([
	['LoadingDots', LoadingDots, 'loading-dots'],
	['LoadingSpinner', LoadingSpinner, 'loading-spinner'],
] as const)('%s', (_name, Loading, slot) => {
	it(`renders an output with data-slot="${slot}" and a default sr-only label of "Loading"`, () => {
		const { container } = renderUI(<Loading />)

		expect(bySlot(container, slot)?.tagName).toBe('OUTPUT')

		expect(screen.getByText('Loading')).toHaveClass('sr-only')
	})

	it('accepts a custom label', () => {
		renderUI(<Loading label="Saving" />)

		expect(screen.getByText('Saving')).toBeInTheDocument()
	})
})

describe('LoadingDots', () => {
	it('renders three aria-hidden dots', () => {
		const { container } = renderUI(<LoadingDots />)

		const dots = bySlot(container, 'loading-dots')

		expect(dots?.querySelectorAll('[aria-hidden="true"]')).toHaveLength(3)
	})
})

describe('LoadingSpinner', () => {
	it('renders an SVG spinner graphic', () => {
		const { container } = renderUI(<LoadingSpinner />)

		const svg = container.querySelector('svg')

		expect(svg).toBeInTheDocument()

		expect(svg).toHaveAttribute('aria-hidden', 'true')
	})

	it('gates the spin animation behind motion-safe (WCAG 2.3.3)', () => {
		const { container } = renderUI(<LoadingSpinner />)

		const spinner = bySlot(container, 'loading-spinner')

		// Rests as a static glyph under prefers-reduced-motion rather than spinning.
		expect(spinner?.className).toContain('motion-safe:animate-spin')
	})
})
