import { describe, expect, it } from 'vitest'
import { LoadingDots, LoadingSpinner } from '../../components/loading'
import { bySlot, renderUI, screen } from '../helpers'

describe('LoadingDots', () => {
	it('renders an output with data-slot="loading-dots"', () => {
		const { container } = renderUI(<LoadingDots />)

		const dots = bySlot(container, 'loading-dots')

		expect(dots).toBeInTheDocument()

		expect(dots?.tagName).toBe('OUTPUT')
	})

	it('has a default sr-only label of "Loading"', () => {
		renderUI(<LoadingDots />)

		expect(screen.getByText('Loading')).toBeInTheDocument()
		expect(screen.getByText('Loading')).toHaveClass('sr-only')
	})

	it('accepts a custom label', () => {
		renderUI(<LoadingDots label="Saving" />)

		expect(screen.getByText('Saving')).toBeInTheDocument()
	})

	it('renders three aria-hidden dots', () => {
		const { container } = renderUI(<LoadingDots />)

		const dots = bySlot(container, 'loading-dots')

		expect(dots?.querySelectorAll('[aria-hidden="true"]')).toHaveLength(3)
	})

	it('applies custom className', () => {
		const { container } = renderUI(<LoadingDots className="big" />)

		const dots = bySlot(container, 'loading-dots')

		expect(dots?.className).toContain('big')
	})
})

describe('LoadingSpinner', () => {
	it('renders an output with data-slot="loading-spinner"', () => {
		const { container } = renderUI(<LoadingSpinner />)

		const spinner = bySlot(container, 'loading-spinner')

		expect(spinner).toBeInTheDocument()

		expect(spinner?.tagName).toBe('OUTPUT')
	})

	it('has a default sr-only label of "Loading"', () => {
		renderUI(<LoadingSpinner />)

		expect(screen.getByText('Loading')).toBeInTheDocument()
		expect(screen.getByText('Loading')).toHaveClass('sr-only')
	})

	it('accepts a custom label', () => {
		renderUI(<LoadingSpinner label="Saving" />)

		expect(screen.getByText('Saving')).toBeInTheDocument()
	})

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

	it('applies custom className', () => {
		const { container } = renderUI(<LoadingSpinner className="big" />)

		const spinner = bySlot(container, 'loading-spinner')

		expect(spinner?.className).toContain('big')
	})
})
