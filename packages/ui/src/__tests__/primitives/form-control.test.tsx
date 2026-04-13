import { describe, expect, it } from 'vitest'
import { FormControl } from '../../primitives'
import { bySlot, renderUI, screen } from '../helpers'

describe('FormControl', () => {
	it('renders a span with data-slot="control"', () => {
		const { container } = renderUI(<FormControl>content</FormControl>)

		const control = bySlot(container, 'control')

		expect(control).toBeInTheDocument()

		expect(control?.tagName).toBe('SPAN')
	})

	it('renders children', () => {
		renderUI(<FormControl>inner content</FormControl>)

		expect(screen.getByText('inner content')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<FormControl className="custom">content</FormControl>)

		const control = bySlot(container, 'control')

		expect(control?.className).toContain('custom')
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<FormControl id="ctrl">content</FormControl>)

		const control = bySlot(container, 'control')

		expect(control).toHaveAttribute('id', 'ctrl')
	})
})
