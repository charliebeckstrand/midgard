import { describe, expect, it } from 'vitest'
import { Placeholder } from '../../components/placeholder'
import { bySlot, renderUI } from '../helpers'

describe('Placeholder', () => {
	it('is hidden from assistive technology', () => {
		const { container } = renderUI(<Placeholder />)

		const el = bySlot(container, 'placeholder')

		expect(el).toHaveAttribute('aria-hidden', 'true')
	})

	it('pulses by default', () => {
		const { container } = renderUI(<Placeholder />)

		expect(bySlot(container, 'placeholder')?.className).toContain('animate-pulse')
	})

	it('stays still when pulse is false', () => {
		const { container } = renderUI(<Placeholder pulse={false} />)

		expect(bySlot(container, 'placeholder')?.className).not.toContain('animate-pulse')
	})
})
