import { describe, expect, it } from 'vitest'
import { Spacer } from '../../structure/spacer'
import { bySlot, renderUI } from '../helpers'

describe('Spacer', () => {
	it('is hidden from assistive technology', () => {
		const { container } = renderUI(<Spacer />)

		const spacer = bySlot(container, 'spacer')

		expect(spacer).toHaveAttribute('aria-hidden', 'true')
	})
})
