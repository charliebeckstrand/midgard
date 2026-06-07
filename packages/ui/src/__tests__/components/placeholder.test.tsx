import { describe, expect, it } from 'vitest'
import { Placeholder } from '../../components/placeholder'
import { bySlot, renderUI } from '../helpers'

describe('Placeholder', () => {
	it('is hidden from assistive technology', () => {
		const { container } = renderUI(<Placeholder />)

		const el = bySlot(container, 'placeholder')

		expect(el).toHaveAttribute('aria-hidden', 'true')
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Placeholder id="test" data-testid="el" />)

		const el = bySlot(container, 'placeholder')

		expect(el).toHaveAttribute('id', 'test')
	})
})
