import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
	SidebarLayout,
	SidebarLayoutBody,
	SidebarLayoutHeader,
} from '../../layouts/sidebar/sidebar'
import { Density } from '../../primitives/density'
import { bySlot, fireEvent, present, renderUI, screen } from '../helpers'

describe('SidebarLayout', () => {
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

		expect(screen.getAllByText('drawer-sidebar').length).toBeGreaterThanOrEqual(1)
	})

	it('reports the mobile drawer opening, and not the floating peek', () => {
		const onOpenChange = vi.fn()

		const { container } = renderUI(
			<SidebarLayout floating sidebar={<div>drawer-sidebar</div>} onOpenChange={onOpenChange}>
				<SidebarLayoutBody>body</SidebarLayoutBody>
			</SidebarLayout>,
		)

		const hotZone = container.querySelector('[aria-hidden]')

		if (!hotZone) throw new Error('hot zone missing')

		// The desktop peek is a pointer affordance over a Sheet the layout holds
		// separately; it is not the disclosure this prop reports.
		fireEvent.pointerEnter(hotZone)

		expect(onOpenChange).not.toHaveBeenCalled()

		fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }))

		expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(true)
	})

	it('applies the default width class to the desktop panel', () => {
		const { container } = renderUI(<SidebarLayout sidebar={<div>sidebar</div>}>body</SidebarLayout>)

		const desktopPanel = container.querySelector('.max-lg\\:hidden')

		expect(desktopPanel?.className).toContain('w-xs')
	})

	it('scales the desktop panel width to the ambient density', () => {
		const { container: small } = renderUI(
			<Density size="sm">
				<SidebarLayout sidebar={<div>side</div>}>body</SidebarLayout>
			</Density>,
		)

		expect(small.querySelector('.max-lg\\:hidden')?.className).toContain('w-2xs')

		const { container: large } = renderUI(
			<Density size="lg">
				<SidebarLayout sidebar={<div>side</div>}>body</SidebarLayout>
			</Density>,
		)

		expect(large.querySelector('.max-lg\\:hidden')?.className).toContain('w-sm')
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
})

describe('SidebarLayoutBody', () => {
	it('forwards ref', () => {
		const ref = createRef<HTMLElement>()

		const { container } = renderUI(<SidebarLayoutBody ref={ref}>content</SidebarLayoutBody>)

		expect(ref.current?.tagName).toBe('MAIN')

		expect(ref.current).toBe(bySlot(container, 'body'))
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

		const hotZone = present(container.querySelector('[aria-hidden="true"]'), '[aria-hidden="true"]')

		expect(hotZone).not.toBeNull()

		fireEvent.pointerEnter(hotZone)

		const sidebars = screen.getAllByText('floating-sidebar')

		expect(sidebars.length).toBeGreaterThan(0)
	})

	it('keeps the sheet open while the pointer moves across the sheet and the start-edge buffer', () => {
		const { container } = renderUI(
			<SidebarLayout sidebar={<div>floating-sidebar</div>} floating>
				body
			</SidebarLayout>,
		)

		const hotZone = present(container.querySelector('[aria-hidden="true"]'), '[aria-hidden="true"]')

		fireEvent.pointerEnter(hotZone)

		const inner = screen.getByText('floating-sidebar').parentElement as HTMLElement

		// Hovering the sheet body itself keeps it open.
		fireEvent.pointerEnter(inner)

		const buffer = present(
			document.body.querySelector('[class*="start-80"]'),
			'[class*="start-80"]',
		)

		expect(buffer).toBeInTheDocument()

		// Crossing into the buffer keeps it open; leaving the sheet entirely closes it.
		fireEvent.pointerEnter(buffer)

		fireEvent.pointerLeave(inner)

		expect(screen.queryByText('floating-sidebar')).not.toBeInTheDocument()

		expect(document.body.querySelector('[class*="start-80"]')).not.toBeInTheDocument()
	})

	it('closes when the pointer leaves the start-edge buffer', () => {
		const { container } = renderUI(
			<SidebarLayout sidebar={<div>floating-sidebar</div>} floating>
				body
			</SidebarLayout>,
		)

		const hotZone = present(container.querySelector('[aria-hidden="true"]'), '[aria-hidden="true"]')

		fireEvent.pointerEnter(hotZone)

		const buffer = present(
			document.body.querySelector('[class*="start-80"]'),
			'[class*="start-80"]',
		)

		expect(buffer).toBeInTheDocument()

		fireEvent.pointerLeave(buffer)

		expect(document.body.querySelector('[class*="start-80"]')).not.toBeInTheDocument()
	})

	it('blurs the page behind the floating peek once it opens', () => {
		const { container } = renderUI(
			<SidebarLayout sidebar={<div>floating-sidebar</div>} floating>
				body
			</SidebarLayout>,
		)

		// No backdrop until the peek opens.
		expect(document.querySelector('[data-slot="overlay-backdrop"]')).toBeNull()

		const hotZone = present(container.querySelector('[aria-hidden="true"]'), '[aria-hidden="true"]')

		fireEvent.pointerEnter(hotZone)

		// The sheet paints its own blurred backdrop — no hand-rolled scrim.
		const backdrop = document.querySelector('[data-slot="overlay-backdrop"]')

		expect(backdrop).toBeInTheDocument()

		expect(backdrop?.className).toContain('backdrop-blur')

		// The wrapper stays non-interactive so the blurred page is still usable.
		const overlay = present(
			document.querySelector('[data-slot="overlay"]'),
			'[data-slot="overlay"]',
		)

		expect(overlay.className).toContain('pointer-events-none')
	})

	it('renders no backdrop when the sidebar is locked (not floating)', () => {
		renderUI(<SidebarLayout sidebar={<div>side</div>}>body</SidebarLayout>)

		expect(document.querySelector('[data-slot="overlay-backdrop"]')).toBeNull()
	})

	it('does not trap focus or lock scroll when the hover-peek opens', () => {
		const { container } = renderUI(
			<SidebarLayout sidebar={<a href="/a">nav-link</a>} floating>
				<button type="button">page button</button>
			</SidebarLayout>,
		)

		const pageButton = screen.getByRole('button', { name: 'page button' })

		pageButton.focus()

		const hotZone = present(container.querySelector('[aria-hidden="true"]'), '[aria-hidden="true"]')

		fireEvent.pointerEnter(hotZone)

		// Mere hover must not steal focus from the page nor lock its scroll.
		expect(document.activeElement).toBe(pageButton)

		expect(document.body.style.overflow).toBe('')
	})

	it('scales the mobile navbar padding to the ambient density', () => {
		const { container: small } = renderUI(
			<Density space="sm">
				<SidebarLayout sidebar={<div>side</div>}>body</SidebarLayout>
			</Density>,
		)

		expect(small.querySelector('[class~="lg:hidden"]')?.className).toContain('p-4')

		const { container: large } = renderUI(
			<Density space="lg">
				<SidebarLayout sidebar={<div>side</div>}>body</SidebarLayout>
			</Density>,
		)

		expect(large.querySelector('[class~="lg:hidden"]')?.className).toContain('p-8')
	})

	// Padding is the `space` axis, and text and icon are the `size` axis. The rail
	// holds text, so its width stays on `size`.
	it('pads from space and sizes the rail from size under a split Density', () => {
		const { container } = renderUI(
			<Density space="sm" size="lg">
				<SidebarLayout sidebar={<div>side</div>}>
					<SidebarLayoutHeader>Title</SidebarLayoutHeader>
					<SidebarLayoutBody>body</SidebarLayoutBody>
				</SidebarLayout>
			</Density>,
		)

		expect(container.querySelector('[class~="lg:hidden"]')).toHaveClass('p-4')

		const header = present(container.querySelector('[data-slot="header"]'), 'header')

		expect(header).toHaveClass('pb-4')

		expect(header).not.toHaveClass('pb-8')

		const content = present(header.parentElement, 'content')

		expect(content).toHaveClass('px-4')

		expect(content).not.toHaveClass('px-8')

		expect(container.querySelector('.max-lg\\:hidden')).toHaveClass('w-sm')
	})

	it('resets the floating sheet to closed when floating flips off', () => {
		const { container, rerender } = renderUI(
			<SidebarLayout sidebar={<div>side</div>} floating>
				body
			</SidebarLayout>,
		)

		const hotZone = present(container.querySelector('[aria-hidden="true"]'), '[aria-hidden="true"]')

		fireEvent.pointerEnter(hotZone)

		// Opening paints the start-edge buffer — the open-state signal.
		expect(document.body.querySelector('[class*="start-80"]')).toBeInTheDocument()

		// Flipping `floating` off resets the sheet to closed; flipping it back on
		// must re-mount it closed, so the buffer stays absent.
		rerender(<SidebarLayout sidebar={<div>side</div>}>body</SidebarLayout>)

		rerender(
			<SidebarLayout sidebar={<div>side</div>} floating>
				body
			</SidebarLayout>,
		)

		expect(document.body.querySelector('[class*="start-80"]')).not.toBeInTheDocument()
	})
})
