import { describe, expect, it } from 'vitest'
import { LoadingDots } from '../../components/loading'
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
