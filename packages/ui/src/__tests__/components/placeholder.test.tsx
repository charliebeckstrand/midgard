import { describe, expect, it } from 'vitest'
import { Placeholder } from '../../components/placeholder'
import { bySlot, renderUI } from '../helpers'

describe('Placeholder', () => {
	it('renders with data-slot="placeholder"', () => {
		const { container } = renderUI(<Placeholder />)

		const el = bySlot(container, 'placeholder')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('DIV')
	})

	it('is hidden from assistive technology', () => {
		const { container } = renderUI(<Placeholder />)

		const el = bySlot(container, 'placeholder')

		expect(el).toHaveAttribute('aria-hidden', 'true')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Placeholder className="custom" />)

		const el = bySlot(container, 'placeholder')

		expect(el?.className).toContain('custom')
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Placeholder id="test" data-testid="el" />)

		const el = bySlot(container, 'placeholder')

		expect(el).toHaveAttribute('id', 'test')
	})
})
