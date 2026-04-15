import { describe, expect, it } from 'vitest'
import {
	Sidebar,
	SidebarBody,
	SidebarDivider,
	SidebarFooter,
	SidebarHeader,
	SidebarLabel,
	SidebarSection,
	SidebarSpacer,
} from '../../components/sidebar'
import { bySlot, renderUI, screen } from '../helpers'

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
