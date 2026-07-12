import { describe, expect, it } from 'vitest'
import { LoadingDots, LoadingOrb, LoadingSpinner } from '../../components/loading'
import { bySlot, renderUI, screen } from '../helpers'

describe('LoadingDots', () => {
	it('renders an output with data-slot="loading-dots" and a default sr-only label of "Loading"', () => {
		const { container } = renderUI(<LoadingDots />)

		const dots = bySlot(container, 'loading-dots')

		expect(dots).toBeInTheDocument()

		expect(dots?.tagName).toBe('OUTPUT')

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
})

describe('LoadingSpinner', () => {
	it('renders an output with data-slot="loading-spinner" and a default sr-only label of "Loading"', () => {
		const { container } = renderUI(<LoadingSpinner />)

		const spinner = bySlot(container, 'loading-spinner')

		expect(spinner).toBeInTheDocument()

		expect(spinner?.tagName).toBe('OUTPUT')

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
})

describe('LoadingOrb', () => {
	it('renders an output with data-slot="loading-orb" and a default sr-only label of "Loading"', () => {
		const { container } = renderUI(<LoadingOrb />)

		const orb = bySlot(container, 'loading-orb')

		expect(orb).toBeInTheDocument()

		expect(orb?.tagName).toBe('OUTPUT')

		expect(screen.getByText('Loading')).toBeInTheDocument()

		expect(screen.getByText('Loading')).toHaveClass('sr-only')
	})

	it('accepts a custom label', () => {
		renderUI(<LoadingOrb label="Saving" />)

		expect(screen.getByText('Saving')).toBeInTheDocument()
	})

	it('renders aria-hidden halo and core layers', () => {
		const { container } = renderUI(<LoadingOrb />)

		const halo = bySlot(container, 'loading-orb-halo')

		const core = bySlot(container, 'loading-orb-core')

		expect(halo).toHaveAttribute('aria-hidden', 'true')

		expect(core).toHaveAttribute('aria-hidden', 'true')
	})

	it('renders the aurora layer stack in rainbow mode', () => {
		const { container } = renderUI(<LoadingOrb color="rainbow" />)

		const core = bySlot(container, 'loading-orb-core')

		// Mono orbs bake shading into one sphere gradient; rainbow stacks a
		// luminous base, four drifting tints, and a static centre glow.
		expect(core?.children).toHaveLength(6)
	})

	it('renders a single sphere layer in monochrome mode', () => {
		const { container } = renderUI(<LoadingOrb color="blue" />)

		const core = bySlot(container, 'loading-orb-core')

		expect(core?.children).toHaveLength(1)
	})
})
