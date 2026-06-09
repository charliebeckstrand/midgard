import { describe, expect, it } from 'vitest'
import { Navbar } from '../../components/navbar'
import { bySlot, expectSlot, renderUI } from '../helpers'

describe('Navbar', () => {
	it('renders with data-slot="navbar"', () => {
		const { container } = renderUI(<Navbar>content</Navbar>)

		expectSlot(container, 'navbar', 'nav')
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
