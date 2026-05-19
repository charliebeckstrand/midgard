import { describe, expect, it, vi } from 'vitest'
import {
	Sidebar,
	SidebarBody,
	SidebarDivider,
	SidebarFooter,
	SidebarHeader,
	SidebarItem,
	SidebarItemActions,
	SidebarLabel,
	SidebarSection,
	SidebarSpacer,
} from '../../components/sidebar'
import { OffcanvasProvider } from '../../primitives/offcanvas'
import { bySlot, fireEvent, renderUI, screen } from '../helpers'

describe('Sidebar', () => {
	it('renders with data-slot="sidebar"', () => {
		const { container } = renderUI(<Sidebar>content</Sidebar>)

		const el = bySlot(container, 'sidebar')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('NAV')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Sidebar className="custom">content</Sidebar>)

		const el = bySlot(container, 'sidebar')

		expect(el?.className).toContain('custom')
	})

	it('has default aria-label', () => {
		const { container } = renderUI(<Sidebar>content</Sidebar>)

		const el = bySlot(container, 'sidebar')

		expect(el).toHaveAttribute('aria-label', 'Sidebar')
	})
})

describe('SidebarHeader', () => {
	it('renders with data-slot="sidebar-header"', () => {
		const { container } = renderUI(
			<Sidebar>
				<SidebarHeader>Header</SidebarHeader>
			</Sidebar>,
		)

		expect(bySlot(container, 'sidebar-header')).toBeInTheDocument()
	})

	it('renders a close button inside an offcanvas surface and invokes close on click', () => {
		const close = vi.fn()

		const { container } = renderUI(
			<OffcanvasProvider value={{ close }}>
				<Sidebar>
					<SidebarHeader>Header</SidebarHeader>
				</Sidebar>
			</OffcanvasProvider>,
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
			<OffcanvasProvider value={{ close }}>
				<Sidebar>
					<SidebarHeader closeIcon={<span data-testid="custom-close">x</span>}>
						Header
					</SidebarHeader>
				</Sidebar>
			</OffcanvasProvider>,
		)

		expect(screen.getByTestId('custom-close')).toBeInTheDocument()
	})
})

describe('SidebarBody', () => {
	it('renders with data-slot="sidebar-body"', () => {
		const { container } = renderUI(
			<Sidebar>
				<SidebarBody>Body</SidebarBody>
			</Sidebar>,
		)

		expect(bySlot(container, 'sidebar-body')).toBeInTheDocument()
	})
})

describe('SidebarFooter', () => {
	it('renders with data-slot="sidebar-footer"', () => {
		const { container } = renderUI(
			<Sidebar>
				<SidebarFooter>Footer</SidebarFooter>
			</Sidebar>,
		)

		expect(bySlot(container, 'sidebar-footer')).toBeInTheDocument()
	})
})

describe('SidebarSection', () => {
	it('renders with data-slot="sidebar-section"', () => {
		const { container } = renderUI(
			<Sidebar>
				<SidebarSection>Section</SidebarSection>
			</Sidebar>,
		)

		expect(bySlot(container, 'sidebar-section')).toBeInTheDocument()
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

describe('SidebarDivider', () => {
	it('renders with data-slot="sidebar-divider"', () => {
		const { container } = renderUI(
			<Sidebar>
				<SidebarDivider />
			</Sidebar>,
		)

		expect(bySlot(container, 'sidebar-divider')).toBeInTheDocument()
	})
})

describe('SidebarSpacer', () => {
	it('renders with data-slot="sidebar-spacer"', () => {
		const { container } = renderUI(
			<Sidebar>
				<SidebarSpacer />
			</Sidebar>,
		)

		expect(bySlot(container, 'sidebar-spacer')).toBeInTheDocument()
	})
})

describe('SidebarItem', () => {
	it('renders with data-slot="sidebar-item"', () => {
		const { container } = renderUI(
			<Sidebar>
				<SidebarItem>Home</SidebarItem>
			</Sidebar>,
		)

		expect(bySlot(container, 'sidebar-item')).toBeInTheDocument()
	})

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

	it('renders its children', () => {
		renderUI(
			<Sidebar>
				<SidebarItem>Dashboard</SidebarItem>
			</Sidebar>,
		)

		expect(screen.getByText('Dashboard')).toBeInTheDocument()
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
})

describe('SidebarItemActions', () => {
	it('renders with data-slot="sidebar-item-actions"', () => {
		const { container } = renderUI(
			<Sidebar>
				<SidebarItem>
					Home
					<SidebarItemActions>
						<span>Edit</span>
					</SidebarItemActions>
				</SidebarItem>
			</Sidebar>,
		)

		expect(bySlot(container, 'sidebar-item-actions')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<Sidebar>
				<SidebarItem>
					Home
					<SidebarItemActions className="custom">
						<span>Edit</span>
					</SidebarItemActions>
				</SidebarItem>
			</Sidebar>,
		)

		const el = bySlot(container, 'sidebar-item-actions')

		expect(el?.className).toContain('custom')
	})

	it('renders its children', () => {
		renderUI(
			<Sidebar>
				<SidebarItem>
					Home
					<SidebarItemActions>
						<span>action-child</span>
					</SidebarItemActions>
				</SidebarItem>
			</Sidebar>,
		)

		expect(screen.getByText('action-child')).toBeInTheDocument()
	})
})
