import { describe, expect, it } from 'vitest'
import { Navbar } from '../../components/navbar'
import { bySlot, renderUI } from '../helpers'

describe('Navbar', () => {
	it('renders with data-slot="navbar" and a default aria-label', () => {
		const { container } = renderUI(<Navbar>content</Navbar>)

		const el = bySlot(container, 'navbar')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('NAV')

		expect(bySlot(container, 'navbar')).toHaveAttribute('aria-label', 'Main')
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Navbar id="test">content</Navbar>)

		const el = bySlot(container, 'navbar')

		expect(el).toHaveAttribute('id', 'test')
	})
})
