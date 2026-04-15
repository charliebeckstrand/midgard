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

	it('renders children', () => {
		renderUI(<Kbd>Enter</Kbd>)

		expect(screen.getByText('Enter')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Kbd className="custom">K</Kbd>)

		const el = bySlot(container, 'kbd')

		expect(el?.className).toContain('custom')
	})

	it('renders command modifier glyph when cmd is set', () => {
		renderUI(<Kbd cmd>K</Kbd>)

		expect(screen.getByText('⌘')).toBeInTheDocument()
	})

	it('renders control modifier glyph when ctrl is set', () => {
		renderUI(<Kbd ctrl>K</Kbd>)

		expect(screen.getByText('⌃')).toBeInTheDocument()
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Kbd id="test">K</Kbd>)

		const el = bySlot(container, 'kbd')

		expect(el).toHaveAttribute('id', 'test')
	})
})
