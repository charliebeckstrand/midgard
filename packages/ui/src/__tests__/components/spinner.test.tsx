import { describe, expect, it } from 'vitest'
import { Spinner } from '../../components/spinner'
import { bySlot, renderUI, screen } from '../helpers'

describe('Spinner', () => {
	it('renders an output with data-slot="spinner"', () => {
		const { container } = renderUI(<Spinner />)
		const spinner = bySlot(container, 'spinner')

		expect(spinner).toBeInTheDocument()
		expect(spinner?.tagName).toBe('OUTPUT')
	})

	it('has a default sr-only label of "Loading"', () => {
		renderUI(<Spinner />)

		expect(screen.getByText('Loading')).toBeInTheDocument()
		expect(screen.getByText('Loading')).toHaveClass('sr-only')
	})

	it('accepts a custom label', () => {
		renderUI(<Spinner label="Saving" />)

		expect(screen.getByText('Saving')).toBeInTheDocument()
	})

	it('renders an SVG spinner graphic', () => {
		const { container } = renderUI(<Spinner />)
		const svg = container.querySelector('svg')

		expect(svg).toBeInTheDocument()
		expect(svg).toHaveAttribute('aria-hidden', 'true')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Spinner className="big" />)
		const spinner = bySlot(container, 'spinner')

		expect(spinner?.className).toContain('big')
	})
})
