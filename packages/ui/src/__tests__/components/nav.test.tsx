import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { Button } from '../../components/button'
import {
	Nav,
	NavBar,
	NavContent,
	NavContents,
	NavItem,
	NavList,
	type NavMenuItemProps,
	type NavProps,
} from '../../components/nav'
import { bySlot, densityStepOf, fireEvent, renderUI, screen } from '../helpers'

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
})

describe('NavBar', () => {
	it('renders with data-slot="nav-bar" and a default aria-label', () => {
		const { container } = renderUI(<NavBar>content</NavBar>)

		const el = bySlot(container, 'nav-bar')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('NAV')

		expect(bySlot(container, 'nav-bar')).toHaveAttribute('aria-label', 'Main')
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

	it('honors an explicit orientation prop over the contextual default', () => {
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
	it('keeps its type, current marker and anchor when a consumer supplies them', () => {
		const { container } = renderUI(
			<Nav>
				<NavList>
					<NavItem current type="submit" aria-current="step" data-slot="theirs">
						Home
					</NavItem>
				</NavList>
			</Nav>,
		)

		// A stray `type` would submit an enclosing form, and a renamed anchor
		// would take the item out of the kata rule that reads it.
		const inner = bySlot(container, 'nav-item-inner')

		expect(inner).toHaveAttribute('type', 'button')

		expect(inner).toHaveAttribute('aria-current', 'true')
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

		expect(inner).toHaveAttribute('aria-current', 'true')

		expect(inner).toHaveAttribute('data-current')
	})

	it('marks a current link as the page, not as a view in the page', () => {
		const { container } = renderUI(
			<Nav>
				<NavList>
					<NavItem href="/home" current>
						Home
					</NavItem>
				</NavList>
			</Nav>,
		)

		expect(bySlot(container, 'nav-item-inner')).toHaveAttribute('aria-current', 'page')
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

		expect(inners[0]).toHaveAttribute('aria-current', 'true')

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

	it('renders the icon prop through the NavItem icon slot', () => {
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

		// The slot insets from the row edge by the padding step of the item, so
		// the control never sits flush against the chrome.
		expect(affixed?.querySelector('[data-slot="nav-item-suffix"]')?.className).toContain(
			'density-me-[1.5,2,2.5,3,3.5]',
		)
	})

	it('renders the affix slots as <div> elements, so a slot can hold flow content', () => {
		const { container } = renderUI(
			<Nav>
				<NavList>
					<NavItem prefix={<span>P</span>} suffix={<span>S</span>}>
						Dashboard
					</NavItem>
				</NavList>
			</Nav>,
		)

		expect(bySlot(container, 'nav-item-prefix')?.tagName).toBe('DIV')

		expect(bySlot(container, 'nav-item-suffix')?.tagName).toBe('DIV')
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
		expect(densityStepOf(screen.getByRole('button', { name: 'auto' }))).toBe('sm')

		expect(densityStepOf(screen.getByRole('button', { name: 'explicit' }))).toBe('lg')
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

	it('renders the panels after the <nav> landmark, not inside it', () => {
		renderUI(
			<Nav aria-label="Settings" defaultValue="account">
				<NavList>
					<NavItem value="account">Account</NavItem>
					<NavItem value="billing">Billing</NavItem>
				</NavList>
				<NavContents>
					<NavContent value="account">Account panel</NavContent>
					<NavContent value="billing">Billing panel</NavContent>
				</NavContents>
			</Nav>,
		)

		const landmark = screen.getByRole('navigation', { name: 'Settings' })

		expect(landmark).toContainElement(screen.getByRole('button', { name: 'Account' }))

		const panel = screen.getByText('Account panel')

		expect(landmark).not.toContainElement(panel)

		expect(landmark.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

		// The panels still read the selection of the Nav.
		fireEvent.click(screen.getByRole('button', { name: 'Billing' }))

		expect(screen.getByText('Billing panel')).toBeInTheDocument()

		expect(screen.queryByText('Account panel')).not.toBeInTheDocument()
	})
})

// The native `defaultValue` and `value` of the element are wider than the
// selection value. Without an Omit, the intersection prints as
// `string | (readonly string[] & string)`.
describe('Nav and NavItem selection value types', () => {
	it('types Nav defaultValue and NavItem value as a plain string', () => {
		expectTypeOf<NavProps['defaultValue']>().toEqualTypeOf<string | undefined>()

		expectTypeOf<NavMenuItemProps['value']>().toEqualTypeOf<string | undefined>()
	})
})
