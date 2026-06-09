import { describe, expect, it } from 'vitest'
import { Kbd } from '../../components/kbd'
import { bySlot, expectSlot, renderUI, screen } from '../helpers'

describe('Kbd', () => {
	it('renders with data-slot="kbd"', () => {
		const { container } = renderUI(<Kbd>K</Kbd>)

		expectSlot(container, 'kbd', 'kbd')
	})

	it('renders command modifier glyph when command is set', () => {
		renderUI(<Kbd command>K</Kbd>)

		expect(screen.getByText('⌘')).toBeInTheDocument()
	})

	it('renders control modifier glyph when control is set', () => {
		renderUI(<Kbd control>K</Kbd>)

		expect(screen.getByText('⌃')).toBeInTheDocument()
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Kbd id="test">K</Kbd>)

		const el = bySlot(container, 'kbd')

		expect(el).toHaveAttribute('id', 'test')
	})
})
