import { describe, expect, it, vi } from 'vitest'
import { Button } from '../../components/button'
import { Nav, NavBar, NavContent, NavContents, NavItem, NavList } from '../../components/nav'
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

describe('NavBar', () => {
	it('renders with data-slot="nav-bar" and a default aria-label', () => {
		const { container } = renderUI(<NavBar>content</NavBar>)

		const el = bySlot(container, 'nav-bar')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('NAV')

		expect(bySlot(container, 'nav-bar')).toHaveAttribute('aria-label', 'Main')
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<NavBar id="test">content</NavBar>)

		const el = bySlot(container, 'nav-bar')

		expect(el).toHaveAttribute('id', 'test')
	})
})

describe('NavList', () => {
	it('defaults to vertical orientation outside of a NavBar', () => {
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

	it('defaults to horizontal orientation inside a NavBar', () => {
		const { container } = renderUI(
			<NavBar>
				<Nav>
					<NavList>content</NavList>
				</Nav>
			</NavBar>,
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

	it('re-seats the interaction chrome on the row when an affix is present', () => {
		const { container } = renderUI(
			<Nav>
				<NavList>
					<NavItem suffix={<button type="button">more</button>}>Dashboard</NavItem>
					<NavItem>Plain</NavItem>
				</NavList>
			</Nav>,
		)

		const [affixed, plain] = Array.from(
			container.querySelectorAll<HTMLElement>('[data-slot="nav-item"]'),
		)

		// The wrapper row has the hover tint and projects the inner button's
		// focus ring via :has, so affix slots render inside the chrome.
		expect(affixed?.className).toContain('has-[[data-slot=nav-item-inner]:focus-visible]:ring-2')

		expect(affixed?.className).toContain('hover:bg-zinc-950/5')

		expect(plain?.className).not.toContain('hover:bg-zinc-950/5')

		// The inner button renders without its own surface, keeping only
		// outline suppression.
		const inner = affixed?.querySelector('[data-slot="nav-item-inner"]')

		expect(inner?.className).not.toContain('focus-visible:ring-2')

		expect(inner?.className).toContain('outline-none')

		// The slot insets from the row edge so the control never sits flush
		// against the chrome.
		expect(affixed?.querySelector('[data-slot="nav-item-suffix"]')?.className).toContain('mr-2')
	})

	it('re-draws the focus ring on the active indicator of a current affixed row', () => {
		const { container } = renderUI(
			<Nav>
				<NavList>
					<NavItem current suffix={<button type="button">more</button>}>
						Dashboard
					</NavItem>
				</NavList>
			</Nav>,
		)

		// The row's own ring paints beneath the indicator's opaque pill, so the
		// focused current row re-draws the ring on the pill.
		expect(bySlot(container, 'active-indicator')?.className).toContain(
			'group-has-[[data-slot=nav-item-inner]:focus-visible]:ring-2',
		)
	})

	it('steps affix controls down one size, with an explicit size winning', () => {
		renderUI(
			<Nav>
				<NavList>
					<NavItem suffix={<Button aria-label="auto" />}>Dashboard</NavItem>
					<NavItem suffix={<Button aria-label="explicit" size="lg" />}>Reports</NavItem>
				</NavList>
			</Nav>,
		)

		// The md item chrome steps slot controls to sm; an explicit size wins.
		expect(screen.getByRole('button', { name: 'auto' })).toHaveAttribute('data-size', 'sm')

		expect(screen.getByRole('button', { name: 'explicit' })).toHaveAttribute('data-size', 'lg')
	})

	it('keeps affix actions individually Tab-focusable (link list, no roving)', () => {
		renderUI(
			<Nav>
				<NavList>
					<NavItem suffix={<button type="button">more</button>}>Dashboard</NavItem>
				</NavList>
			</Nav>,
		)

		// NavList is a plain link list, not a roving composite; the affix action
		// stays in the natural Tab order.
		expect(screen.getByRole('button', { name: 'more' }).tabIndex).toBe(0)
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
