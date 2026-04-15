import { describe, expect, it } from 'vitest'
import { Nav, NavList } from '../../components/nav'
import { bySlot, renderUI, screen } from '../helpers'

describe('Nav', () => {
	it('renders with data-slot="nav"', () => {
		const { container } = renderUI(
			<Nav>
				<NavList>content</NavList>
			</Nav>,
		)

		const el = bySlot(container, 'nav')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('NAV')
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<Nav className="custom">
				<NavList>content</NavList>
			</Nav>,
		)

		const el = bySlot(container, 'nav')

		expect(el?.className).toContain('custom')
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(
			<Nav id="test">
				<NavList>content</NavList>
			</Nav>,
		)

		const el = bySlot(container, 'nav')

		expect(el).toHaveAttribute('id', 'test')
	})
})

describe('NavList', () => {
	it('renders with data-slot="nav-list"', () => {
		const { container } = renderUI(
			<Nav>
				<NavList>content</NavList>
			</Nav>,
		)

		expect(bySlot(container, 'nav-list')).toBeInTheDocument()
	})

	it('renders children', () => {
		renderUI(
			<Nav>
				<NavList>Hello</NavList>
			</Nav>,
		)

		expect(screen.getByText('Hello')).toBeInTheDocument()
	})
})
