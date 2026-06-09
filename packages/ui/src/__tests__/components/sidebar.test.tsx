import { describe, expect, it, vi } from 'vitest'
import {
	Sidebar,
	SidebarBody,
	SidebarHeader,
	SidebarItem,
	SidebarLabel,
	SidebarList,
} from '../../components/sidebar'
import { OffcanvasContext } from '../../primitives/offcanvas'
import { bySlot, expectSlot, fireEvent, renderUI, screen } from '../helpers'

describe('Sidebar', () => {
	it('renders with data-slot="sidebar"', () => {
		const { container } = renderUI(<Sidebar>content</Sidebar>)

		expectSlot(container, 'sidebar', 'nav')
	})

	it('has default aria-label', () => {
		const { container } = renderUI(<Sidebar>content</Sidebar>)

		const el = bySlot(container, 'sidebar')

		expect(el).toHaveAttribute('aria-label', 'Sidebar')
	})

	it('fires a consumer onKeyDown without losing roving navigation', () => {
		const onKeyDown = vi.fn()

		const { container } = renderUI(
			<Sidebar onKeyDown={onKeyDown}>
				<SidebarItem>Home</SidebarItem>
				<SidebarItem>Settings</SidebarItem>
			</Sidebar>,
		)

		const nav = bySlot(container, 'sidebar') as HTMLElement

		const items = container.querySelectorAll<HTMLButtonElement>('[data-slot="sidebar-item-inner"]')

		items[0]?.focus()

		fireEvent.keyDown(nav, { key: 'ArrowDown' })

		// Roving still advances focus to the next item...
		expect(items[1]).toHaveFocus()

		// ...and the consumer's handler is chained rather than clobbered.
		expect(onKeyDown).toHaveBeenCalledTimes(1)
	})

	it('is a single Tab stop seated on the current page', () => {
		const { container } = renderUI(
			<Sidebar>
				<SidebarItem>Home</SidebarItem>
				<SidebarItem current>Settings</SidebarItem>
				<SidebarItem>Help</SidebarItem>
			</Sidebar>,
		)

		const items = Array.from(
			container.querySelectorAll<HTMLButtonElement>('[data-slot="sidebar-item-inner"]'),
		)

		// The nav is one Tab stop, resting on the current page rather than one
		// stop per item.
		expect(items.map((b) => b.tabIndex)).toEqual([-1, 0, -1])
	})
})

describe('SidebarHeader', () => {
	it('renders a close button inside an offcanvas surface and invokes close on click', () => {
		const close = vi.fn()

		const { container } = renderUI(
			<OffcanvasContext value={{ close }}>
				<Sidebar>
					<SidebarHeader>Header</SidebarHeader>
				</Sidebar>
			</OffcanvasContext>,
		)

		const header = bySlot(container, 'sidebar-header')

		expect(header?.className).toContain('justify-between')

		const closeButton = screen.getByRole('button', { name: 'Close navigation' })

		expect(closeButton).toBeInTheDocument()

		fireEvent.click(closeButton)

		expect(close).toHaveBeenCalledOnce()
	})

	it('uses a custom closeIcon when provided in an offcanvas surface', () => {
		const close = vi.fn()

		renderUI(
			<OffcanvasContext value={{ close }}>
				<Sidebar>
					<SidebarHeader closeIcon={<span data-testid="custom-close">x</span>}>
						Header
					</SidebarHeader>
				</Sidebar>
			</OffcanvasContext>,
		)

		expect(screen.getByTestId('custom-close')).toBeInTheDocument()
	})
})

describe('SidebarLabel', () => {
	it('renders with data-slot="sidebar-label"', () => {
		const { container } = renderUI(
			<Sidebar>
				<SidebarLabel>Label</SidebarLabel>
			</Sidebar>,
		)

		expect(bySlot(container, 'sidebar-label')).toBeInTheDocument()

		expect(screen.getByText('Label')).toBeInTheDocument()
	})
})

describe('SidebarItem', () => {
	it('renders as a link when href is provided', () => {
		const { container } = renderUI(
			<Sidebar>
				<SidebarItem href="/home">Home</SidebarItem>
			</Sidebar>,
		)

		const inner = bySlot(container, 'sidebar-item-inner')

		expect(inner?.tagName).toBe('A')

		expect(inner).toHaveAttribute('href', '/home')
	})

	it('marks the current item with aria-current="page"', () => {
		const { container } = renderUI(
			<Sidebar>
				<SidebarItem current>Home</SidebarItem>
			</Sidebar>,
		)

		const inner = bySlot(container, 'sidebar-item-inner')

		expect(inner).toHaveAttribute('aria-current', 'page')
	})

	it('renders an icon prop through the createNavItem icon slot', () => {
		const { container } = renderUI(
			<Sidebar>
				<SidebarItem icon={<svg data-testid="sidebar-icon" />}>Home</SidebarItem>
			</Sidebar>,
		)

		expect(bySlot(container, 'sidebar-item')).toBeInTheDocument()

		expect(screen.getByTestId('sidebar-icon')).toBeInTheDocument()
	})

	it('renders prefix and suffix slots outside the inner button', () => {
		const { container } = renderUI(
			<Sidebar>
				<SidebarItem
					prefix={<button type="button">drag</button>}
					suffix={<button type="button">more</button>}
				>
					Home
				</SidebarItem>
			</Sidebar>,
		)

		const prefix = bySlot(container, 'sidebar-item-prefix')

		const suffix = bySlot(container, 'sidebar-item-suffix')

		const inner = bySlot(container, 'sidebar-item-inner')

		expect(prefix).toBeInTheDocument()

		expect(suffix).toBeInTheDocument()

		// The slots host their own interactive elements, kept out of the button.
		expect(prefix?.contains(inner ?? null)).toBe(false)

		expect(suffix?.contains(inner ?? null)).toBe(false)

		expect(inner?.querySelector('button')).toBeNull()

		expect(screen.getByRole('button', { name: 'drag' })).toBeInTheDocument()

		expect(screen.getByRole('button', { name: 'more' })).toBeInTheDocument()
	})

	it('omits the affix slots when no prefix or suffix is provided', () => {
		const { container } = renderUI(
			<Sidebar>
				<SidebarItem>Home</SidebarItem>
			</Sidebar>,
		)

		expect(bySlot(container, 'sidebar-item-prefix')).toBeNull()

		expect(bySlot(container, 'sidebar-item-suffix')).toBeNull()
	})
})

describe('SidebarList', () => {
	it('renders a <ul> and exposes its items as a list', () => {
		const { container } = renderUI(
			<Sidebar>
				<SidebarBody>
					<SidebarList aria-label="Primary">
						<SidebarItem>Home</SidebarItem>
						<SidebarItem>Inbox</SidebarItem>
					</SidebarList>
				</SidebarBody>
			</Sidebar>,
		)

		const list = bySlot(container, 'sidebar-list')

		expect(list?.tagName).toBe('UL')

		expect(screen.getByRole('list', { name: 'Primary' })).toBe(list)

		const items = screen.getAllByRole('listitem')

		expect(items).toHaveLength(2)

		// Each item is a real <li> wrapping its link, so AT reports count/position.
		expect(items[0]).toHaveAttribute('data-slot', 'sidebar-item')

		expect(items[0]?.tagName).toBe('LI')
	})

	it('keeps standalone items as <span> wrappers', () => {
		const { container } = renderUI(
			<Sidebar>
				<SidebarItem>Home</SidebarItem>
			</Sidebar>,
		)

		expect(bySlot(container, 'sidebar-item')?.tagName).toBe('SPAN')
	})
})
