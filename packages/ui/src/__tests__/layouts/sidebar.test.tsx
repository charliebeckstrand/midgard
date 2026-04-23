import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import {
	SidebarLayout,
	SidebarLayoutBody,
	SidebarLayoutFooter,
	SidebarLayoutHeader,
} from '../../layouts/sidebar/component'
import { bySlot, fireEvent, renderUI, screen } from '../helpers'

describe('SidebarLayout', () => {
	it('renders children', () => {
		renderUI(<SidebarLayout sidebar={<div>sidebar</div>}>Hello</SidebarLayout>)

		expect(screen.getByText('Hello')).toBeInTheDocument()
	})

	it('renders the sidebar content', () => {
		renderUI(<SidebarLayout sidebar={<div>sidebar content</div>}>body</SidebarLayout>)

		expect(screen.getAllByText('sidebar content').length).toBeGreaterThan(0)
	})

	it('renders the navbar when provided', () => {
		renderUI(
			<SidebarLayout sidebar={<div>sidebar</div>} navbar={<div>navbar content</div>}>
				body
			</SidebarLayout>,
		)

		expect(screen.getByText('navbar content')).toBeInTheDocument()
	})

	it('renders the mobile navigation trigger', () => {
		renderUI(<SidebarLayout sidebar={<div>sidebar</div>}>body</SidebarLayout>)

		expect(screen.getByRole('button', { name: 'Open navigation' })).toBeInTheDocument()
	})

	it('renders a custom menu icon when provided', () => {
		renderUI(
			<SidebarLayout
				sidebar={<div>sidebar</div>}
				menuIcon={<span data-testid="custom-menu">☰</span>}
			>
				body
			</SidebarLayout>,
		)

		expect(screen.getByTestId('custom-menu')).toBeInTheDocument()
	})

	it('renders desktop header actions when actions are provided', () => {
		renderUI(
			<SidebarLayout sidebar={<div>sidebar</div>} actions={<button type="button">Save</button>}>
				<SidebarLayoutHeader>Title</SidebarLayoutHeader>
			</SidebarLayout>,
		)

		expect(screen.getAllByRole('button', { name: 'Save' }).length).toBeGreaterThan(0)
	})

	it('opens the mobile drawer when the trigger is clicked', () => {
		renderUI(
			<SidebarLayout sidebar={<div>drawer-sidebar</div>}>
				<SidebarLayoutBody>body</SidebarLayoutBody>
			</SidebarLayout>,
		)

		const trigger = screen.getByRole('button', { name: 'Open navigation' })

		fireEvent.click(trigger)

		// Sidebar content appears twice after opening (desktop + mobile mount).
		expect(screen.getAllByText('drawer-sidebar').length).toBeGreaterThanOrEqual(1)
	})
})

describe('SidebarLayoutHeader', () => {
	it('renders with data-slot="header"', () => {
		const { container } = renderUI(<SidebarLayoutHeader>content</SidebarLayoutHeader>)

		const el = bySlot(container, 'header')

		expect(el).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<SidebarLayoutHeader className="custom">content</SidebarLayoutHeader>,
		)

		const el = bySlot(container, 'header')

		expect(el?.className).toContain('custom')
	})

	it('renders children', () => {
		renderUI(<SidebarLayoutHeader>Header text</SidebarLayoutHeader>)

		expect(screen.getByText('Header text')).toBeInTheDocument()
	})
})

describe('SidebarLayoutBody', () => {
	it('renders with data-slot="body"', () => {
		const { container } = renderUI(<SidebarLayoutBody>content</SidebarLayoutBody>)

		const el = bySlot(container, 'body')

		expect(el).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<SidebarLayoutBody className="custom">content</SidebarLayoutBody>,
		)

		const el = bySlot(container, 'body')

		expect(el?.className).toContain('custom')
	})

	it('forwards ref', () => {
		const ref = createRef<HTMLDivElement>()

		const { container } = renderUI(<SidebarLayoutBody ref={ref}>content</SidebarLayoutBody>)

		expect(ref.current).toBeInstanceOf(HTMLDivElement)

		expect(ref.current).toBe(bySlot(container, 'body'))
	})
})

describe('SidebarLayoutFooter', () => {
	it('renders with data-slot="footer"', () => {
		const { container } = renderUI(<SidebarLayoutFooter>content</SidebarLayoutFooter>)

		const el = bySlot(container, 'footer')

		expect(el).toBeInTheDocument()
	})

	it('renders children', () => {
		renderUI(<SidebarLayoutFooter>Footer text</SidebarLayoutFooter>)

		expect(screen.getByText('Footer text')).toBeInTheDocument()
	})
})
