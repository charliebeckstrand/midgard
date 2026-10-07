import { createRef } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { Button } from '../../components/button'
import {
	Sidebar,
	SidebarBody,
	SidebarHeader,
	SidebarItem,
	SidebarLabel,
	SidebarList,
	useSidebarMini,
} from '../../components/sidebar'
import { OffcanvasContext } from '../../primitives/offcanvas'
import {
	act,
	attach,
	bySlot,
	densityStepOf,
	fireEvent,
	getSlot,
	renderUI,
	screen,
	setupUser,
	stubMatchMedia,
} from '../helpers'

describe('Sidebar', () => {
	it('renders with data-slot="sidebar" and a default aria-label', () => {
		const { container } = renderUI(<Sidebar>content</Sidebar>)

		const el = bySlot(container, 'sidebar')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('NAV')

		expect(bySlot(container, 'sidebar')).toHaveAttribute('aria-label', 'Sidebar')
	})

	it('fires a consumer onKeyDown without losing roving navigation', () => {
		const onKeyDown = vi.fn()

		const { container } = renderUI(
			<Sidebar onKeyDown={onKeyDown}>
				<SidebarItem>Home</SidebarItem>
				<SidebarItem>Settings</SidebarItem>
			</Sidebar>,
		)

		const nav = getSlot(container, 'sidebar')

		const items = container.querySelectorAll<HTMLButtonElement>('[data-slot="sidebar-item-inner"]')

		items[0]?.focus()

		fireEvent.keyDown(nav, { key: 'ArrowDown' })

		// Roving still advances focus to the next item.
		expect(items[1]).toHaveFocus()

		// The consumer's handler is chained rather than clobbered.
		expect(onKeyDown).toHaveBeenCalledTimes(1)
	})

	// Roving is a keyboard model no consumer switches off, so a consumer
	// `preventDefault()` does not cancel it (CONVENTIONS.md §3.9).
	it('runs a consumer onKeyDown before roving, which still moves focus when it prevents the default', () => {
		const seen: [boolean, Element | null][] = []

		const { container } = renderUI(
			<Sidebar
				onKeyDown={(event) => {
					seen.push([event.defaultPrevented, document.activeElement])

					event.preventDefault()
				}}
			>
				<SidebarItem>Home</SidebarItem>
				<SidebarItem>Settings</SidebarItem>
			</Sidebar>,
		)

		const items = container.querySelectorAll<HTMLButtonElement>('[data-slot="sidebar-item-inner"]')

		items[0]?.focus()

		fireEvent.keyDown(getSlot(container, 'sidebar'), { key: 'ArrowDown' })

		expect(seen).toEqual([[false, items[0]]])

		expect(items[1]).toHaveFocus()
	})

	it('forwards a consumer ref without losing roving navigation', () => {
		const ref = createRef<HTMLElement>()

		const { container } = renderUI(
			<Sidebar ref={ref}>
				<SidebarItem>Home</SidebarItem>
				<SidebarItem>Settings</SidebarItem>
			</Sidebar>,
		)

		const nav = getSlot(container, 'sidebar')

		const items = container.querySelectorAll<HTMLButtonElement>('[data-slot="sidebar-item-inner"]')

		expect(ref.current).toBe(nav)

		items[0]?.focus()

		fireEvent.keyDown(nav, { key: 'ArrowDown' })

		expect(items[1]).toHaveFocus()
	})

	it('roves into affix actions with Left/Right and back to items with Up/Down', () => {
		const { container } = renderUI(
			<Sidebar>
				<SidebarItem>Home</SidebarItem>
				<SidebarItem
					prefix={<button type="button">drag</button>}
					suffix={<button type="button">more</button>}
				>
					Settings
				</SidebarItem>
			</Sidebar>,
		)

		const nav = getSlot(container, 'sidebar')

		const items = container.querySelectorAll<HTMLButtonElement>('[data-slot="sidebar-item-inner"]')

		items[1]?.focus()

		fireEvent.keyDown(nav, { key: 'ArrowRight' })

		expect(screen.getByRole('button', { name: 'more' })).toHaveFocus()

		fireEvent.keyDown(nav, { key: 'ArrowLeft' })

		expect(items[1]).toHaveFocus()

		fireEvent.keyDown(nav, { key: 'ArrowLeft' })

		expect(screen.getByRole('button', { name: 'drag' })).toHaveFocus()

		// Main-axis arrows move from the action to the adjacent row's item.
		fireEvent.keyDown(nav, { key: 'ArrowUp' })

		expect(items[0]).toHaveFocus()
	})

	it('keeps affix actions out of the Tab order', () => {
		const { container } = renderUI(
			<Sidebar>
				<SidebarItem suffix={<button type="button">more</button>}>Home</SidebarItem>
			</Sidebar>,
		)

		const action = screen.getByRole('button', { name: 'more' })

		expect(action.tabIndex).toBe(-1)

		// Focusing the action keeps the resting Tab stop on the item.
		action.focus()

		const inner = bySlot(container, 'sidebar-item-inner') as HTMLButtonElement | null

		expect(inner?.tabIndex).toBe(0)
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

	it('marks a current link as the page, and a current button as the current view', () => {
		const { container } = renderUI(
			<Sidebar>
				<SidebarItem href="/home" current>
					Home
				</SidebarItem>
				<SidebarItem current>Settings</SidebarItem>
			</Sidebar>,
		)

		const [link, button] = Array.from(
			container.querySelectorAll<HTMLElement>('[data-slot="sidebar-item-inner"]'),
		)

		expect(link).toHaveAttribute('aria-current', 'page')

		// A button switches a view in the page, so it is not the current page.
		expect(button).toHaveAttribute('aria-current', 'true')
	})
})

describe('Sidebar mini', () => {
	it('marks the nav with data-mini', () => {
		const { container } = renderUI(<Sidebar mini>content</Sidebar>)

		expect(bySlot(container, 'sidebar')).toHaveAttribute('data-mini')
	})

	it('omits data-mini by default', () => {
		const { container } = renderUI(<Sidebar>content</Sidebar>)

		expect(bySlot(container, 'sidebar')).not.toHaveAttribute('data-mini')
	})

	it('backs items with a label tooltip on desktop', async () => {
		// Desktop viewport and a hover-capable pointer.
		stubMatchMedia(() => true)

		const user = setupUser()

		const { container } = renderUI(
			<Sidebar mini>
				<SidebarItem icon={<svg aria-hidden="true" />}>
					<SidebarLabel>Home</SidebarLabel>
				</SidebarItem>
			</Sidebar>,
		)

		const inner = getSlot(container, 'sidebar-item-inner')

		// The trigger clones onto the item button itself, keeping its slot.
		expect(inner.tagName).toBe('BUTTON')

		await user.click(inner)

		expect(bySlot(document.body, 'tooltip-content')).toBeInTheDocument()

		expect(bySlot(document.body, 'tooltip-content')).toHaveTextContent('Home')
	})

	it('surfaces only the SidebarLabel in the tooltip', async () => {
		stubMatchMedia(() => true)

		const user = setupUser()

		const { container } = renderUI(
			<Sidebar mini>
				<SidebarItem>
					<SidebarLabel>Home</SidebarLabel>
					<span>New</span>
				</SidebarItem>
			</Sidebar>,
		)

		const inner = getSlot(container, 'sidebar-item-inner')

		await user.click(inner)

		expect(bySlot(document.body, 'tooltip-content')).toBeInTheDocument()

		const tooltip = bySlot(document.body, 'tooltip-content')

		// The portal escapes the rail's group-scoped hiding, so the surface
		// must not echo non-label children (actions, affix helpers).
		expect(tooltip).toHaveTextContent('Home')

		expect(tooltip).not.toHaveTextContent('remove')
	})

	it('keeps plain items below the desktop breakpoint', async () => {
		stubMatchMedia(() => false)

		const user = setupUser()

		const { container } = renderUI(
			<Sidebar mini>
				<SidebarItem icon={<svg aria-hidden="true" />}>
					<SidebarLabel>Home</SidebarLabel>
				</SidebarItem>
			</Sidebar>,
		)

		const inner = getSlot(container, 'sidebar-item-inner')

		await user.click(inner)

		expect(bySlot(document.body, 'tooltip-content')).toBeNull()
	})

	it('keeps the label in the rail via sr-only rather than removing it', () => {
		const { container } = renderUI(
			<Sidebar mini>
				<SidebarItem>
					<SidebarLabel>Home</SidebarLabel>
				</SidebarItem>
			</Sidebar>,
		)

		// Visually collapsed on the desktop rail, still in the accessible name.
		expect(bySlot(container, 'sidebar-label')?.className).toContain(
			'lg:group-data-mini/sidebar:sr-only',
		)
	})

	it('squares items to the rail width', () => {
		const { container } = renderUI(
			<Sidebar mini>
				<SidebarItem>
					<SidebarLabel>Home</SidebarLabel>
				</SidebarItem>
			</Sidebar>,
		)

		// Height follows the rail width, so items stay uniform squares even
		// when icon glyph aspect ratios differ.
		expect(bySlot(container, 'sidebar-item-inner')?.className).toContain(
			'lg:group-data-mini/sidebar:aspect-square',
		)
	})

	// The root took a render prop for this once, and it was the library's one
	// root render prop. The context it already broadcast does the same work, so
	// the three cases below read it instead.
	function Branch() {
		return <span data-testid="branch">{useSidebarMini() ? 'rail' : 'full'}</span>
	}

	it('resolves mini to true on desktop, for a descendant reading the context', () => {
		stubMatchMedia(() => true)

		renderUI(
			<Sidebar mini>
				<Branch />
			</Sidebar>,
		)

		expect(screen.getByTestId('branch')).toHaveTextContent('rail')
	})

	it('resolves mini to false below the desktop breakpoint', () => {
		stubMatchMedia(() => false)

		renderUI(
			<Sidebar mini>
				<Branch />
			</Sidebar>,
		)

		expect(screen.getByTestId('branch')).toHaveTextContent('full')
	})

	it('resolves mini to false when the prop is unset', () => {
		stubMatchMedia(() => true)

		renderUI(
			<Sidebar>
				<Branch />
			</Sidebar>,
		)

		expect(screen.getByTestId('branch')).toHaveTextContent('full')
	})

	// The server knows no width. The recipe draws the rail at `lg` from
	// `data-mini` in CSS, so the server markup holds the full state, which is
	// correct below `lg` and which the CSS collapses at `lg` and up.
	const miniSidebar = (
		<Sidebar mini>
			<Branch />
			<SidebarList>
				<SidebarItem icon={<svg />}>
					<SidebarLabel>Home</SidebarLabel>
				</SidebarItem>
			</SidebarList>
		</Sidebar>
	)

	it('prerenders the full state with data-mini, so CSS alone draws the rail at lg', () => {
		const html = renderToString(miniSidebar)

		expect(html).toContain('data-mini=""')

		expect(html).toContain('<span data-testid="branch">full</span>')

		// The rail button of an item takes this class only in the resolved mini state.
		expect(html).not.toContain('*:cursor-pointer')
	})

	it.each([
		['a desktop', 'rail', true],
		['a phone', 'full', false],
	])(
		'hydrates on %s viewport with no mismatch, then shows the %s form',
		(_name, branch, desktop) => {
			const html = renderToString(miniSidebar)

			stubMatchMedia(() => desktop)

			const container = attach(document.createElement('div'))

			container.innerHTML = html

			const onRecoverableError = vi.fn()

			const consoleError = vi.spyOn(console, 'error')

			let root: Root | undefined

			act(() => {
				root = hydrateRoot(container, miniSidebar, { onRecoverableError })
			})

			onTestFinished(() => act(() => root?.unmount()))

			expect(onRecoverableError).not.toHaveBeenCalled()

			expect(consoleError).not.toHaveBeenCalled()

			expect(screen.getByTestId('branch')).toHaveTextContent(branch)
		},
	)
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

		expect(header?.className).toContain('gap-3')

		const closeButton = screen.getByRole('button', { name: 'Close navigation' })

		expect(closeButton).toBeInTheDocument()

		fireEvent.click(closeButton)

		expect(close).toHaveBeenCalledOnce()
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
	it('keeps its type, current marker and roving anchor when a consumer supplies them', () => {
		const { container } = renderUI(
			<Sidebar>
				<SidebarItem current type="submit" aria-current="step" data-slot="theirs">
					Home
				</SidebarItem>
			</Sidebar>,
		)

		// The Sidebar's roving selects on this anchor, so a rename would drop the
		// item out of the keyboard model.
		const inner = bySlot(container, 'sidebar-item-inner')

		expect(inner).toHaveAttribute('type', 'button')

		expect(inner).toHaveAttribute('aria-current', 'true')
	})

	it('renders an icon prop through the SidebarItem icon slot', () => {
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

	it('re-seats the interaction chrome on the row when an affix is present', () => {
		const { container } = renderUI(
			<Sidebar>
				<SidebarItem suffix={<button type="button">more</button>}>Home</SidebarItem>
				<SidebarItem>Plain</SidebarItem>
			</Sidebar>,
		)

		const [affixed, plain] = Array.from(
			container.querySelectorAll<HTMLElement>('[data-slot="sidebar-item"]'),
		)

		// The wrapper row has the hover tint and projects the inner button's
		// focus ring via :has, so affix slots render inside the chrome.
		expect(affixed?.className).toContain(
			'has-[[data-slot=sidebar-item-inner]:focus-visible]:ring-2',
		)

		expect(affixed?.className).toContain('hover:bg-zinc-950/5')

		expect(plain?.className).not.toContain('hover:bg-zinc-950/5')

		// The inner button renders without its own surface, keeping only
		// outline suppression.
		const inner = affixed?.querySelector('[data-slot="sidebar-item-inner"]')

		expect(inner?.className).not.toContain('focus-visible:ring-2')

		expect(inner?.className).toContain('outline-none')

		// The slot insets from the row edge so the control never sits flush
		// against the chrome, at the step of the row.
		expect(affixed?.querySelector('[data-slot="sidebar-item-suffix"]')?.className).toContain(
			'density-me-[',
		)
	})

	it('re-draws the focus ring on the active indicator of a current affixed row', () => {
		const { container } = renderUI(
			<Sidebar>
				<SidebarItem current suffix={<button type="button">more</button>}>
					Home
				</SidebarItem>
			</Sidebar>,
		)

		// The row's own ring paints beneath the indicator's opaque pill, so the
		// focused current row re-draws the ring on the pill.
		expect(bySlot(container, 'active-indicator')?.className).toContain(
			'group-has-[[data-slot=sidebar-item-inner]:focus-visible]:ring-2',
		)
	})

	it('steps affix controls down one size, with an explicit size winning', () => {
		renderUI(
			<Sidebar>
				<SidebarItem suffix={<Button aria-label="auto" />}>Home</SidebarItem>
				<SidebarItem size="lg" suffix={<Button aria-label="from-lg" />}>
					Docs
				</SidebarItem>
				<SidebarItem suffix={<Button aria-label="explicit" size="lg" />}>Help</SidebarItem>
			</Sidebar>,
		)

		// md host → sm control; lg host → md; an explicit size prop wins.
		expect(densityStepOf(screen.getByRole('button', { name: 'auto' }))).toBe('sm')

		expect(densityStepOf(screen.getByRole('button', { name: 'from-lg' }))).toBe('md')

		expect(densityStepOf(screen.getByRole('button', { name: 'explicit' }))).toBe('lg')
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

	it('renders a suffix control beside the button, not inside it', () => {
		const { container } = renderUI(
			<Sidebar>
				<SidebarItem suffix={<button type="button">remove</button>}>
					<SidebarLabel>Home</SidebarLabel>
				</SidebarItem>
			</Sidebar>,
		)

		const suffix = bySlot(container, 'sidebar-item-suffix')

		const inner = bySlot(container, 'sidebar-item-inner')

		// The interactive control stays out of the <button>, keeping markup
		// valid, and the affix flips the row to its chrome.
		expect(inner?.querySelector('button')).toBeNull()

		expect(suffix?.contains(screen.getByRole('button', { name: 'remove' }))).toBe(true)

		expect(bySlot(container, 'sidebar-item')?.className).toContain('hover:bg-zinc-950/5')
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

	it('renders standalone items as <div> wrappers', () => {
		const { container } = renderUI(
			<Sidebar>
				<SidebarItem>Home</SidebarItem>
			</Sidebar>,
		)

		// The wrapper holds the affix slots, which can hold flow content.
		expect(bySlot(container, 'sidebar-item')?.tagName).toBe('DIV')
	})

	it('renders the affix slots as <div> elements, so flow content is valid inside', () => {
		const { container } = renderUI(
			<Sidebar>
				<SidebarList>
					<SidebarItem
						prefix={<span>P</span>}
						suffix={
							<div>
								<button type="button">Edit</button>
							</div>
						}
					>
						Home
					</SidebarItem>
				</SidebarList>
			</Sidebar>,
		)

		expect(bySlot(container, 'sidebar-item-prefix')?.tagName).toBe('DIV')

		// A `<span>` slot cannot hold a `<div>`.
		expect(bySlot(container, 'sidebar-item-suffix')?.tagName).toBe('DIV')
	})
})
