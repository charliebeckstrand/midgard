import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import {
	SidebarLayout,
	SidebarLayoutBody,
	SidebarLayoutFooter,
	SidebarLayoutHeader,
} from '../../layouts/sidebar/sidebar'
import { Density } from '../../primitives/density'
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

	it('applies the default width class to the desktop panel', () => {
		const { container } = renderUI(<SidebarLayout sidebar={<div>sidebar</div>}>body</SidebarLayout>)

		const desktopPanel = container.querySelector('.max-lg\\:hidden')

		expect(desktopPanel?.className).toContain('w-xs')
	})

	it('hides the inline desktop panel when floating is true', () => {
		const { container } = renderUI(
			<SidebarLayout sidebar={<div>sidebar</div>} floating>
				body
			</SidebarLayout>,
		)

		const inlinePanel = container.querySelector('.w-xs')

		expect(inlinePanel).toBeNull()
	})

	it('applies panelClassName to the desktop panel wrapper', () => {
		const { container } = renderUI(
			<SidebarLayout sidebar={<div>sidebar</div>} panelClassName="custom-panel">
				body
			</SidebarLayout>,
		)

		const desktopPanel = container.querySelector('.custom-panel')

		expect(desktopPanel).toBeInTheDocument()
		expect(desktopPanel?.className).toContain('max-lg:hidden')
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

describe('SidebarLayout floating mode', () => {
	it('renders a hot-zone hover target when floating is true', () => {
		const { container } = renderUI(
			<SidebarLayout sidebar={<div>nav</div>} floating>
				body
			</SidebarLayout>,
		)

		const hotZone = container.querySelector('[aria-hidden="true"]')

		expect(hotZone).toBeInTheDocument()
	})

	it('opens the floating sheet on pointer enter of the hot zone', () => {
		const { container } = renderUI(
			<SidebarLayout sidebar={<div>floating-sidebar</div>} floating>
				body
			</SidebarLayout>,
		)

		const hotZone = container.querySelector('[aria-hidden="true"]') as HTMLElement

		expect(hotZone).not.toBeNull()

		fireEvent.pointerEnter(hotZone)

		const sidebars = screen.getAllByText('floating-sidebar')

		expect(sidebars.length).toBeGreaterThan(0)
	})

	it('keeps the sheet open while the pointer moves across the sheet and the right-edge buffer', () => {
		const { container } = renderUI(
			<SidebarLayout sidebar={<div>floating-sidebar</div>} floating>
				body
			</SidebarLayout>,
		)

		const hotZone = container.querySelector('[aria-hidden="true"]') as HTMLElement

		fireEvent.pointerEnter(hotZone)

		const inner = screen.getByText('floating-sidebar').parentElement as HTMLElement

		// Hovering the sheet body itself keeps it open.
		fireEvent.pointerEnter(inner)

		const buffer = document.body.querySelector('[class*="left-80"]') as HTMLElement

		expect(buffer).toBeInTheDocument()

		// Crossing into the buffer keeps it open; leaving the sheet entirely closes it.
		fireEvent.pointerEnter(buffer)

		fireEvent.pointerLeave(inner)

		expect(screen.queryByText('floating-sidebar')).not.toBeInTheDocument()

		expect(document.body.querySelector('[class*="left-80"]')).not.toBeInTheDocument()
	})

	it('closes when the pointer leaves the right-edge buffer', () => {
		const { container } = renderUI(
			<SidebarLayout sidebar={<div>floating-sidebar</div>} floating>
				body
			</SidebarLayout>,
		)

		const hotZone = container.querySelector('[aria-hidden="true"]') as HTMLElement

		fireEvent.pointerEnter(hotZone)

		const buffer = document.body.querySelector('[class*="left-80"]') as HTMLElement

		expect(buffer).toBeInTheDocument()

		fireEvent.pointerLeave(buffer)

		expect(document.body.querySelector('[class*="left-80"]')).not.toBeInTheDocument()
	})

	it('scales the mobile navbar padding to the ambient density', () => {
		const { container: small } = renderUI(
			<Density size="sm">
				<SidebarLayout sidebar={<div>side</div>}>body</SidebarLayout>
			</Density>,
		)

		expect(small.querySelector('[class~="lg:hidden"]')?.className).toContain('p-4')

		const { container: large } = renderUI(
			<Density size="lg">
				<SidebarLayout sidebar={<div>side</div>}>body</SidebarLayout>
			</Density>,
		)

		expect(large.querySelector('[class~="lg:hidden"]')?.className).toContain('p-8')
	})

	it('resets the floating sheet to closed when floating flips off', () => {
		const { container, rerender } = renderUI(
			<SidebarLayout sidebar={<div>side</div>} floating>
				body
			</SidebarLayout>,
		)

		const hotZone = container.querySelector('[aria-hidden="true"]') as HTMLElement

		fireEvent.pointerEnter(hotZone)

		rerender(<SidebarLayout sidebar={<div>side</div>}>body</SidebarLayout>)

		rerender(
			<SidebarLayout sidebar={<div>side</div>} floating>
				body
			</SidebarLayout>,
		)

		expect(container).toBeInTheDocument()
	})
})
