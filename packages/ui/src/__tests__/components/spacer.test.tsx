import { describe, expect, it } from 'vitest'
import { Spacer } from '../../components/spacer'
import { bySlot, renderUI } from '../helpers'

describe('Spacer', () => {
	it('renders with data-slot="spacer"', () => {
		const { container } = renderUI(<Spacer />)

		const el = bySlot(container, 'spacer')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('DIV')
	})

	it('is hidden from assistive technology', () => {
		const { container } = renderUI(<Spacer />)

		const el = bySlot(container, 'spacer')

		expect(el).toHaveAttribute('aria-hidden', 'true')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Spacer className="custom" />)

		const el = bySlot(container, 'spacer')

		expect(el?.className).toContain('custom')
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Spacer id="test" data-testid="el" />)

		const el = bySlot(container, 'spacer')

		expect(el).toHaveAttribute('id', 'test')
	})
})
