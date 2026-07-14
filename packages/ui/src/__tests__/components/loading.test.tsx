import { describe, expect, it } from 'vitest'
import { Button } from '../../components/button'
import { LoadingDots, LoadingSpinner } from '../../components/loading'
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

	it('tags each dot with data-slot="loading-dot" for host size projection', () => {
		const { container } = renderUI(<LoadingDots />)

		const dots = bySlot(container, 'loading-dots')

		// The label span is not a dot, so exactly the three dots carry the slot.
		expect(dots?.querySelectorAll('[data-slot="loading-dot"]')).toHaveLength(3)

		expect(screen.getByText('Loading')).not.toHaveAttribute('data-slot', 'loading-dot')
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

// The loading leaves are static and read no context (static-component
// boundary), so a host sizes them by projecting onto their slot. The button
// kata carries that projection per size; these pin the wiring — the projection
// class rides the button and the indicator sits as a direct child the child
// combinator reaches.
describe('loading indicators inside a Button', () => {
	it('projects the button size onto a prefix LoadingSpinner slot', () => {
		const { container } = renderUI(<Button size="lg" prefix={<LoadingSpinner />} />)

		const button = bySlot(container, 'button')

		expect(button).toHaveClass('*:data-[slot=loading-spinner]:size-6')

		expect(bySlot(container, 'loading-spinner')?.parentElement).toBe(button)
	})

	it('projects the button size onto a prefix LoadingDots slot', () => {
		const { container } = renderUI(<Button size="sm" prefix={<LoadingDots />} />)

		const button = bySlot(container, 'button')

		expect(button).toHaveClass(
			'*:data-[slot=loading-dots]:gap-1',
			'*:data-[slot=loading-dots]:*:data-[slot=loading-dot]:size-1.5',
		)

		expect(bySlot(container, 'loading-dots')?.parentElement).toBe(button)
	})

	it('sizes the loading swap spinner to the button', () => {
		const { container } = renderUI(
			<Button size="xs" loading>
				Save
			</Button>,
		)

		expect(bySlot(container, 'button')).toHaveClass('*:data-[slot=loading-spinner]:size-3')
	})
})
