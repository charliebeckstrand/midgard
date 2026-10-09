import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	SidebarLayout,
	SidebarLayoutBody,
	SidebarLayoutHeader,
} from '../../layouts/sidebar/sidebar'
import { readChoice, SIDEBAR, writeChoice } from '../../providers/appearance/appearance-storage'
import { act, bySlot, densityStepOf, fireEvent, present, renderUI, screen } from '../helpers'

/** The inline desktop panel: the one element with the `md` width of the rail. */
const DESKTOP_PANEL = '.density-md\\:w-xs'

/** The copy of the sidebar in the floating sheet. The inline panel holds the other copy. */
const inSheet = (text: string) =>
	screen.queryAllByText(text).find((element) => element.closest('[data-slot="overlay"]')) ?? null

afterEach(() => {
	localStorage.clear()
})

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

		// The inline desktop panel renders the sidebar already, so the drawer adds a copy.
		const before = screen.getAllByText('drawer-sidebar').length

		fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }))

		expect(screen.getAllByText('drawer-sidebar')).toHaveLength(before + 1)
	})

	it('tells assistive technology that the navbar button opens a dialog, and its state', () => {
		renderUI(
			<SidebarLayout sidebar={<div>drawer-sidebar</div>}>
				<SidebarLayoutBody>body</SidebarLayoutBody>
			</SidebarLayout>,
		)

		const trigger = screen.getByRole('button', { name: 'Open navigation' })

		expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')

		expect(trigger).toHaveAttribute('aria-expanded', 'false')

		fireEvent.click(trigger)

		expect(trigger).toHaveAttribute('aria-expanded', 'true')
	})

	it('reports the mobile drawer opening, and not the floating peek', () => {
		const onOpenChange = vi.fn()

		const { container } = renderUI(
			<SidebarLayout sidebar={<div>drawer-sidebar</div>} onOpenChange={onOpenChange}>
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

	it('gives the desktop panel a width for each density step', () => {
		const { container } = renderUI(<SidebarLayout sidebar={<div>sidebar</div>}>body</SidebarLayout>)

		expect(container.querySelector(DESKTOP_PANEL)).toHaveClass(
			'density-[xs,sm]:w-2xs',
			'density-[lg,xl]:w-sm',
		)
	})

	it('sizes the desktop panel at the step of the nearest scope', () => {
		const { container } = renderUI(
			<div data-density="sm">
				<SidebarLayout sidebar={<div>side</div>}>body</SidebarLayout>
			</div>,
		)

		const panel = container.querySelector(DESKTOP_PANEL)

		expect(panel).not.toBeNull()

		expect(densityStepOf(panel as Element)).toBe('sm')
	})

	it('swaps the inline panel for the hot zone while the sidebar is offcanvas', () => {
		const { container } = renderUI(<SidebarLayout sidebar={<div>sidebar</div>}>body</SidebarLayout>)

		// The class of the root selects the sidebar, so the first paint is correct.
		expect(container.querySelector(DESKTOP_PANEL)).toHaveClass('sidebar-offcanvas:hidden')

		expect(container.querySelector('[aria-hidden="true"]')).toHaveClass(
			'hidden',
			'lg:sidebar-offcanvas:block',
		)
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

describe('SidebarLayout offcanvas mode', () => {
	it('opens the floating sheet on pointer enter of the hot zone', () => {
		const { container } = renderUI(
			<SidebarLayout sidebar={<div>floating-sidebar</div>}>body</SidebarLayout>,
		)

		const hotZone = present(container.querySelector('[aria-hidden="true"]'), '[aria-hidden="true"]')

		fireEvent.pointerEnter(hotZone)

		expect(inSheet('floating-sidebar')).toBeInTheDocument()
	})

	it('keeps the sheet open while the pointer moves across the sheet and the start-edge buffer', () => {
		const { container } = renderUI(
			<SidebarLayout sidebar={<div>floating-sidebar</div>}>body</SidebarLayout>,
		)

		const hotZone = present(container.querySelector('[aria-hidden="true"]'), '[aria-hidden="true"]')

		fireEvent.pointerEnter(hotZone)

		const inner = present(inSheet('floating-sidebar'), 'sheet sidebar').parentElement as HTMLElement

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

		expect(inSheet('floating-sidebar')).toBeNull()

		expect(document.body.querySelector('[class*="start-80"]')).not.toBeInTheDocument()
	})

	it('closes when the pointer leaves the start-edge buffer', () => {
		const { container } = renderUI(
			<SidebarLayout sidebar={<div>floating-sidebar</div>}>body</SidebarLayout>,
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
			<SidebarLayout sidebar={<div>floating-sidebar</div>}>body</SidebarLayout>,
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

	it('renders no backdrop until the peek opens', () => {
		renderUI(<SidebarLayout sidebar={<div>side</div>}>body</SidebarLayout>)

		expect(document.querySelector('[data-slot="overlay-backdrop"]')).toBeNull()
	})

	it('does not trap focus or lock scroll when the hover-peek opens', () => {
		const { container } = renderUI(
			<SidebarLayout sidebar={<a href="/a">nav-link</a>}>
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

	it('pads the mobile navbar with a stepped class, which follows the nearest scope', () => {
		const { container } = renderUI(<SidebarLayout sidebar={<div>side</div>}>body</SidebarLayout>)

		expect(container.querySelector('[class~="lg:hidden"]')).toHaveClass('density-p-[2,4,6,8,10]')
	})

	it('resets the floating sheet to closed when the sidebar mode changes', () => {
		writeChoice(SIDEBAR.key, 'offcanvas')

		const { container } = renderUI(<SidebarLayout sidebar={<div>side</div>}>body</SidebarLayout>)

		const hotZone = present(container.querySelector('[aria-hidden="true"]'), '[aria-hidden="true"]')

		fireEvent.pointerEnter(hotZone)

		// Opening paints the start-edge buffer — the open-state signal.
		expect(document.body.querySelector('[class*="start-80"]')).toBeInTheDocument()

		// Locking the sidebar closes the sheet; going back to offcanvas keeps it
		// closed, so the buffer stays absent.
		act(() => writeChoice(SIDEBAR.key, 'locked'))

		act(() => writeChoice(SIDEBAR.key, 'offcanvas'))

		expect(document.body.querySelector('[class*="start-80"]')).not.toBeInTheDocument()
	})

	it('looks for the current item once while the drawer stays open', () => {
		const lookup = vi.spyOn(HTMLElement.prototype, 'querySelector')

		const layout = (navbar: string) => (
			<SidebarLayout
				sidebar={
					<a href="/" data-current="">
						Home
					</a>
				}
				navbar={navbar}
			>
				body
			</SidebarLayout>
		)

		const { rerender } = renderUI(layout('One'))

		fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }))

		rerender(layout('Two'))

		rerender(layout('Three'))

		const current = lookup.mock.calls.filter(([selector]) => selector === '[data-current]')

		lookup.mockRestore()

		expect(current).toHaveLength(1)
	})
})

describe('SidebarLayout shortcut', () => {
	const press = (target: Element | Window, init: KeyboardEventInit = {}) =>
		fireEvent.keyDown(target, { key: 'b', code: 'KeyB', ctrlKey: true, ...init })

	it('toggles the sidebar setting one time for each press of Ctrl+B', () => {
		renderUI(<SidebarLayout sidebar={<div>side</div>}>body</SidebarLayout>)

		act(() => {
			press(window)
		})

		expect(readChoice(SIDEBAR)).toBe('offcanvas')

		act(() => {
			press(window)
		})

		expect(readChoice(SIDEBAR)).toBe('locked')
	})

	it('ignores the auto-repeat of a held chord', () => {
		renderUI(<SidebarLayout sidebar={<div>side</div>}>body</SidebarLayout>)

		act(() => {
			press(window)

			press(window, { repeat: true })

			press(window, { repeat: true })
		})

		expect(readChoice(SIDEBAR)).toBe('offcanvas')
	})

	it('toggles one time when a page nests a layout', () => {
		renderUI(
			<SidebarLayout sidebar={<div>outer</div>}>
				<SidebarLayout sidebar={<div>inner</div>}>body</SidebarLayout>
			</SidebarLayout>,
		)

		act(() => {
			press(window)
		})

		expect(readChoice(SIDEBAR)).toBe('offcanvas')
	})

	it('leaves the chord to a form field', () => {
		renderUI(
			<SidebarLayout sidebar={<div>side</div>}>
				<input aria-label="Name" />
			</SidebarLayout>,
		)

		act(() => {
			press(screen.getByRole('textbox', { name: 'Name' }))
		})

		expect(readChoice(SIDEBAR)).toBe('locked')
	})
})
