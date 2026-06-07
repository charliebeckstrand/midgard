import { describe, expect, it } from 'vitest'
import { Spacer } from '../../components/spacer'
import { bySlot, renderUI } from '../helpers'

describe('Spacer', () => {
	it('is hidden from assistive technology', () => {
		const { container } = renderUI(<Spacer />)

		const el = bySlot(container, 'spacer')

		expect(el).toHaveAttribute('aria-hidden', 'true')
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Spacer id="test" data-testid="el" />)

		const el = bySlot(container, 'spacer')

		expect(el).toHaveAttribute('id', 'test')
	})
})
