import { describe, expect, it } from 'vitest'
import { Kbd } from '../../components/kbd'
import { bySlot, renderUI, screen } from '../helpers'

describe('Kbd', () => {
	it('renders with data-slot="kbd"', () => {
		const { container } = renderUI(<Kbd>K</Kbd>)

		const el = bySlot(container, 'kbd')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('KBD')
	})

	it('holds its glyph width instead of stretching in a flex parent', () => {
		const { container } = renderUI(<Kbd>K</Kbd>)

		expect(bySlot(container, 'kbd')).toHaveClass('w-fit')
	})

	it('renders a modifier glyph written into the children, in platform order', () => {
		renderUI(<Kbd>⌃⌘K</Kbd>)

		expect(screen.getByText('⌃⌘K')).toBeInTheDocument()
	})
})
