import { describe, expect, it } from 'vitest'
import { Navbar } from '../../components/navbar'
import { bySlot, renderUI, screen } from '../helpers'

describe('Navbar', () => {
	it('renders with data-slot="navbar"', () => {
		const { container } = renderUI(<Navbar>content</Navbar>)

		const el = bySlot(container, 'navbar')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('NAV')
	})

	it('renders children', () => {
		renderUI(<Navbar>Hello</Navbar>)

		expect(screen.getByText('Hello')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Navbar className="custom">content</Navbar>)

		const el = bySlot(container, 'navbar')

		expect(el?.className).toContain('custom')
	})

	it('has default aria-label', () => {
		const { container } = renderUI(<Navbar>content</Navbar>)

		const el = bySlot(container, 'navbar')

		expect(el).toHaveAttribute('aria-label', 'Main')
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Navbar id="test">content</Navbar>)

		const el = bySlot(container, 'navbar')

		expect(el).toHaveAttribute('id', 'test')
	})
})
