import { describe, expect, it, vi } from 'vitest'
import { Nav, NavContent, NavContents, NavItem, NavList } from '../../components/nav'
import { Navbar } from '../../components/navbar'
import { bySlot, fireEvent, renderUI, screen } from '../helpers'

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
	it('defaults to vertical orientation outside of a Navbar', () => {
		const { container } = renderUI(
			<Nav>
				<NavList>content</NavList>
			</Nav>,
		)

		expect(bySlot(container, 'nav-list')).toHaveAttribute('data-orientation', 'vertical')
	})

	it('honours an explicit orientation prop over the contextual default', () => {
		const { container } = renderUI(
			<Nav>
				<NavList orientation="horizontal">content</NavList>
			</Nav>,
		)

		expect(bySlot(container, 'nav-list')).toHaveAttribute('data-orientation', 'horizontal')
	})

	it('defaults to horizontal orientation inside a Navbar', () => {
		const { container } = renderUI(
			<Navbar>
				<Nav>
					<NavList>content</NavList>
				</Nav>
			</Navbar>,
		)

		expect(bySlot(container, 'nav-list')).toHaveAttribute('data-orientation', 'horizontal')
	})
})

describe('NavItem', () => {
	it('renders as a link when href is provided', () => {
		const { container } = renderUI(
			<Nav>
				<NavList>
					<NavItem href="/home">Home</NavItem>
				</NavList>
			</Nav>,
		)

		const inner = bySlot(container, 'nav-item-inner')

		expect(inner?.tagName).toBe('A')

		expect(inner).toHaveAttribute('href', '/home')
	})

	it('renders as a button by default', () => {
		const { container } = renderUI(
			<Nav>
				<NavList>
					<NavItem>Home</NavItem>
				</NavList>
			</Nav>,
		)

		const inner = bySlot(container, 'nav-item-inner')

		expect(inner?.tagName).toBe('BUTTON')
	})

	it('marks the item as current when current is true', () => {
		const { container } = renderUI(
			<Nav>
				<NavList>
					<NavItem current>Home</NavItem>
				</NavList>
			</Nav>,
		)

		const inner = bySlot(container, 'nav-item-inner')

		expect(inner).toHaveAttribute('aria-current', 'page')

		expect(inner).toHaveAttribute('data-current')
	})

	it('treats the item as current when its value matches the Nav value', () => {
		const { container } = renderUI(
			<Nav value="home">
				<NavList>
					<NavItem value="home">Home</NavItem>
					<NavItem value="about">About</NavItem>
				</NavList>
			</Nav>,
		)

		const inners = container.querySelectorAll('[data-slot="nav-item-inner"]')

		expect(inners[0]).toHaveAttribute('aria-current', 'page')

		expect(inners[1]).not.toHaveAttribute('aria-current')
	})

	it('calls Nav onValueChange with the item value when clicked', () => {
		const onChange = vi.fn()

		renderUI(
			<Nav onValueChange={onChange}>
				<NavList>
					<NavItem value="home">Home</NavItem>
				</NavList>
			</Nav>,
		)

		fireEvent.click(screen.getByText('Home'))

		expect(onChange).toHaveBeenCalledWith('home')
	})

	it('invokes onClick when clicked', () => {
		const onClick = vi.fn()

		renderUI(
			<Nav>
				<NavList>
					<NavItem onClick={onClick}>Home</NavItem>
				</NavList>
			</Nav>,
		)

		fireEvent.click(screen.getByText('Home'))

		expect(onClick).toHaveBeenCalled()
	})

	it('renders the icon prop through the createNavItem icon slot', () => {
		const { container } = renderUI(
			<Nav>
				<NavList>
					<NavItem icon={<svg aria-hidden />}>Dashboard</NavItem>
				</NavList>
			</Nav>,
		)

		expect(bySlot(container, 'icon')).toBeInTheDocument()
	})
})

describe('NavContent / NavContents', () => {
	it('renders content children', () => {
		renderUI(
			<Nav value="home">
				<NavContents>
					<NavContent value="home">Home panel</NavContent>
				</NavContents>
			</Nav>,
		)

		expect(screen.getByText('Home panel')).toBeInTheDocument()
	})
})
