import { Activity, createRef, type ReactNode } from 'react'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { Tab, TabContent, TabContents, TabList, Tabs, type TabsProps } from '../../components/tabs'
import { DensityProvider } from '../../providers/density'
import {
	act,
	bySlot,
	fireEvent,
	getSlot,
	renderUI,
	screen,
	setupUser,
	userEvent,
	waitFor,
} from '../helpers'

describe('TabList', () => {
	it('keeps its role, orientation and roving when a consumer supplies them', async () => {
		const onKeyDown = vi.fn()

		const { container } = renderUI(
			<Tabs value="a" onValueChange={() => {}}>
				{/* Every prop here is hostile: a stray role, the wrong orientation,
				    and a handler that would replace the roving model. */}
				<TabList
					aria-label="Sections"
					role="presentation"
					aria-orientation="vertical"
					onKeyDown={onKeyDown}
				>
					<Tab value="a">A</Tab>
					<Tab value="b">B</Tab>
				</TabList>
			</Tabs>,
		)

		const list = bySlot(container, 'tab-list')

		expect(list).toHaveAttribute('role', 'tablist')

		expect(list).toHaveAttribute('aria-orientation', 'horizontal')

		const tabs = screen.getAllByRole('tab')

		tabs[0]?.focus()

		await userEvent.keyboard('{ArrowRight}')

		// The consumer's handler runs, and roving still moves the focus.
		expect(onKeyDown).toHaveBeenCalled()

		expect(document.activeElement).toBe(tabs[1])
	})

	// Roving reads the list through its own ref. A consumer ref must join it, or
	// the arrow keys stop moving focus.
	it('keeps roving when a consumer holds a ref to the list', async () => {
		const ref = createRef<HTMLDivElement>()

		const { container } = renderUI(
			<Tabs value="a" onValueChange={() => {}}>
				<TabList aria-label="Sections" ref={ref}>
					<Tab value="a">A</Tab>
					<Tab value="b">B</Tab>
				</TabList>
			</Tabs>,
		)

		expect(ref.current).toBe(bySlot(container, 'tab-list'))

		const tabs = screen.getAllByRole('tab')

		tabs[0]?.focus()

		await userEvent.keyboard('{ArrowRight}')

		expect(document.activeElement).toBe(tabs[1])
	})

	it('forwards the full button surface to the tab', () => {
		renderUI(
			<Tabs value="a" onValueChange={() => {}}>
				<TabList aria-label="Sections">
					<Tab value="a" aria-label="Overview tab" data-testid="tab-a" title="Overview" />
				</TabList>
			</Tabs>,
		)

		const tab = screen.getByRole('tab', { name: 'Overview tab' })

		// The type advertises the whole button surface: aria-label on icon-only
		// tabs, test ids, titles, focus handlers all pass through.
		expect(tab).toHaveAttribute('data-testid', 'tab-a')

		expect(tab).toHaveAttribute('title', 'Overview')
	})

	it('keeps aria-controls on inactive tabs while held panels stay mounted', () => {
		const { container } = renderUI(
			<Tabs value="a" onValueChange={() => {}}>
				<TabList aria-label="Sections">
					<Tab value="a">A</Tab>
					<Tab value="b">B</Tab>
				</TabList>
				<TabContents mount="always">
					<TabContent value="a">Panel A</TabContent>
					<TabContent value="b">Panel B</TabContent>
				</TabContents>
			</Tabs>,
		)

		const tabs = container.querySelectorAll('[role="tab"]')

		// mount="always" keeps inactive panels mounted, so the inactive tab's
		// reference resolves instead of being omitted.
		const inactive = tabs[1] as HTMLElement

		const controls = inactive.getAttribute('aria-controls')

		expect(controls).toBeTruthy()

		expect(document.getElementById(controls as string)).not.toBeNull()
	})

	it('wraps the underline list in a horizontal scroll viewport', () => {
		const { container } = renderUI(
			<Tabs defaultValue="a">
				<TabList aria-label="Tabs">
					<Tab value="a">Tab A</Tab>
				</TabList>
			</Tabs>,
		)

		const viewport = bySlot(container, 'tab-list-scroll')

		// The viewport is the scroll-region wrapper around the role="tablist", so an
		// over-long tab row scrolls in place instead of widening the page.
		expect(viewport).toBeInTheDocument()

		expect(viewport).toHaveAttribute('data-scroll-region')

		expect(viewport?.className).toContain('overflow-x-auto')

		expect(viewport).toContainElement(bySlot(container, 'tab-list'))
	})

	it('sizes the horizontal list to its content so the baseline rail spans the full scroll width', () => {
		const { container } = renderUI(
			<Tabs defaultValue="a">
				<TabList aria-label="Tabs">
					<Tab value="a">Tab A</Tab>
				</TabList>
			</Tabs>,
		)

		// A block-level flex box fills only the viewport, clipping its border-b
		// there; w-max + min-w-full grow it to the content width (never below full
		// width) so the rail runs under overflowed tabs instead of stopping short.
		const list = bySlot(container, 'tab-list')

		expect(list?.className).toContain('w-max')

		expect(list?.className).toContain('min-w-full')
	})

	it('omits the content-width utilities on a vertical list, whose rail already spans its height', () => {
		const { container } = renderUI(
			<Tabs defaultValue="a" orientation="vertical">
				<TabList aria-label="Tabs">
					<Tab value="a">Tab A</Tab>
				</TabList>
			</Tabs>,
		)

		// An auto-height column grows to its content, so border-l already runs the
		// full length; the width utilities are horizontal-only and would be inert.
		const list = bySlot(container, 'tab-list')

		expect(list?.className).not.toContain('w-max')

		expect(list?.className).not.toContain('min-w-full')
	})

	it('scrolls along the cross axis for a vertical list', () => {
		const { container } = renderUI(
			<Tabs defaultValue="a" orientation="vertical">
				<TabList aria-label="Tabs">
					<Tab value="a">Tab A</Tab>
				</TabList>
			</Tabs>,
		)

		expect(bySlot(container, 'tab-list-scroll')?.className).toContain('overflow-y-auto')
	})

	it('omits the scroll viewport for the segment variant', () => {
		const { container } = renderUI(
			<Tabs defaultValue="a" variant="segment">
				<TabList aria-label="Tabs">
					<Tab value="a">Tab A</Tab>
				</TabList>
			</Tabs>,
		)

		// The segment box is a fixed pill control with no overflow viewport.
		expect(bySlot(container, 'tab-list-scroll')).not.toBeInTheDocument()

		expect(bySlot(container, 'tab-list')).toBeInTheDocument()
	})

	it('reflects vertical orientation on tab-group and tab-list', () => {
		const { container } = renderUI(
			<Tabs defaultValue="a" orientation="vertical">
				<TabList aria-label="Tabs">
					<Tab value="a">Tab A</Tab>
				</TabList>
				<TabContents>
					<TabContent value="a">Panel A</TabContent>
				</TabContents>
			</Tabs>,
		)

		expect(bySlot(container, 'tab-group')).toHaveAttribute('data-orientation', 'vertical')

		const list = bySlot(container, 'tab-list')

		expect(list).toHaveAttribute('data-orientation', 'vertical')

		expect(list).toHaveAttribute('aria-orientation', 'vertical')
	})
})

describe('Tab', () => {
	it('writes padding and text as stepped classes, which follow the nearest scope', () => {
		const { container } = renderUI(
			<TabList aria-label="Tabs">
				<Tab current>Tab A</Tab>
			</TabList>,
		)

		expect(bySlot(container, 'tab')).toHaveClass(
			'density-text-[xs,sm,base,lg,xl]',
			'density-px-[1,2,3,4,5]',
			'density-pb-[2,3,4,5,6]',
		)
	})

	it('follows the scope of a DensityProvider when used à la carte (TabList + Tab without <Tabs>)', () => {
		const { container } = renderUI(
			<DensityProvider density="loose">
				<TabList aria-label="Tabs">
					<Tab current>Tab A</Tab>
				</TabList>
			</DensityProvider>,
		)

		expect(bySlot(container, 'tab')?.closest('[data-density]')).toHaveAttribute(
			'data-density',
			'lg',
		)
	})

	it('makes the group a scope for an explicit size, and opens none without one', () => {
		const { container } = renderUI(
			<DensityProvider density="loose">
				<Tabs defaultValue="a" size="sm">
					<TabList aria-label="Tabs">
						<Tab value="a">A</Tab>
					</TabList>
				</Tabs>
				<Tabs defaultValue="a">
					<TabList aria-label="Other">
						<Tab value="a">A</Tab>
					</TabList>
				</Tabs>
			</DensityProvider>,
		)

		const [sized, unsized] = Array.from(container.querySelectorAll('[data-slot="tab-group"]'))

		expect(sized).toHaveAttribute('data-density', 'sm')

		expect(unsized).not.toHaveAttribute('data-density')
	})

	it('explicit current prop wins over the Tabs context value', () => {
		const { container } = renderUI(
			<Tabs defaultValue="a">
				<TabList aria-label="Tabs">
					<Tab value="a">A</Tab>
					<Tab value="b" current>
						B forced
					</Tab>
				</TabList>
			</Tabs>,
		)

		const tabs = container.querySelectorAll<HTMLElement>('[data-slot="tab"]')

		// First tab matches the context value "a" → current; second is forced via prop.
		expect(tabs[0]).toHaveAttribute('data-current', '')

		expect(tabs[1]).toHaveAttribute('data-current', '')

		expect(tabs[1]).toHaveAttribute('aria-selected', 'true')
	})

	it('selects a tab by value through the Tabs context onChange', async () => {
		const onValueChange = vi.fn()

		const { container } = renderUI(
			<Tabs defaultValue="a" onValueChange={onValueChange}>
				<TabList aria-label="Tabs">
					<Tab value="a">A</Tab>
					<Tab value="b">B</Tab>
				</TabList>
			</Tabs>,
		)

		const tabs = container.querySelectorAll<HTMLElement>('[data-slot="tab"]')

		const user = setupUser()

		await user.click(tabs[1] as HTMLElement)

		expect(onValueChange).toHaveBeenCalledWith('b')
	})

	it('invokes the caller onClick handler when a Tab is clicked', () => {
		const onClick = vi.fn()

		const { container } = renderUI(
			<TabList aria-label="Tabs">
				<Tab onClick={onClick}>Standalone</Tab>
			</TabList>,
		)

		const tab = getSlot(container, 'tab')

		fireEvent.click(tab)

		expect(onClick).toHaveBeenCalled()
	})

	it('wires aria-controls when a Tab id is provided', () => {
		const { container } = renderUI(
			<TabList aria-label="Tabs">
				<Tab id="settings">Settings</Tab>
			</TabList>,
		)

		const tab = getSlot(container, 'tab')

		expect(tab).toHaveAttribute('id', 'settings')

		expect(tab).toHaveAttribute('aria-controls', 'settings-panel')
	})

	it('renders the segment variant on Tab when wrapped in <Tabs variant="segment">', () => {
		const { container } = renderUI(
			<Tabs variant="segment" defaultValue="a">
				<TabList aria-label="Tabs">
					<Tab value="a">A</Tab>
				</TabList>
			</Tabs>,
		)

		const tab = bySlot(container, 'tab')

		// Segment variant emits a different recipe; sanity check that the tab still renders.
		expect(tab).toBeInTheDocument()

		expect(tab).toHaveAttribute('data-current', '')
	})

	it('wires a segment tab to its TabContent as a tab and a tabpanel', () => {
		// The segment swaps the content under it, so the content is a tabpanel
		// that the tab controls and that the tab names.
		renderUI(
			<Tabs variant="segment" defaultValue="a">
				<TabList aria-label="Tabs">
					<Tab value="a">A</Tab>
					<Tab value="b">B</Tab>
				</TabList>
				<TabContents>
					<TabContent value="a">Panel A</TabContent>
					<TabContent value="b">Panel B</TabContent>
				</TabContents>
			</Tabs>,
		)

		const tab = screen.getByRole('tab', { name: 'A' })

		const panel = screen.getByRole('tabpanel', { name: 'A' })

		expect(panel).toHaveTextContent('Panel A')

		expect(tab).toHaveAttribute('aria-controls', panel.id)
	})

	it('sets no aria-controls on a segment tab with no TabContents', () => {
		// A segmented control often has no panels, so a reference would point at a missing id.
		renderUI(
			<Tabs variant="segment" defaultValue="a">
				<TabList aria-label="Tabs">
					<Tab value="a">A</Tab>
					<Tab value="b">B</Tab>
				</TabList>
			</Tabs>,
		)

		for (const tab of screen.getAllByRole('tab')) {
			expect(tab).not.toHaveAttribute('aria-controls')
		}
	})

	it('applies a custom className on Tab', () => {
		const { container } = renderUI(
			<TabList aria-label="Tabs">
				<Tab className="my-tab">A</Tab>
			</TabList>,
		)

		expect(bySlot(container, 'tab')?.className).toContain('my-tab')
	})
})

describe('Tab onPreload', () => {
	function twoTabs(props: { onPreload?: (value: string | undefined) => void }, extra = {}) {
		return renderUI(
			<Tabs value="a" onValueChange={() => {}}>
				<TabList aria-label="Sections">
					<Tab value="a">A</Tab>
					<Tab value="b" onPreload={props.onPreload} {...extra}>
						B
					</Tab>
				</TabList>
			</Tabs>,
		)
	}

	it('fires once with the value on first pointer intent for an inactive tab', () => {
		const onPreload = vi.fn()

		twoTabs({ onPreload })

		const inactive = screen.getByRole('tab', { name: 'B' })

		fireEvent.pointerEnter(inactive)

		fireEvent.pointerEnter(inactive)

		// Latched: repeated hovers warm the panel once, not on every move.
		expect(onPreload).toHaveBeenCalledTimes(1)

		expect(onPreload).toHaveBeenCalledWith('b')
	})

	it('also fires on focus intent', () => {
		const onPreload = vi.fn()

		twoTabs({ onPreload })

		fireEvent.focus(screen.getByRole('tab', { name: 'B' }))

		expect(onPreload).toHaveBeenCalledWith('b')
	})

	it('never fires for the active tab', () => {
		const onPreload = vi.fn()

		renderUI(
			<Tabs value="a" onValueChange={() => {}}>
				<TabList aria-label="Sections">
					<Tab value="a" onPreload={onPreload}>
						A
					</Tab>
				</TabList>
			</Tabs>,
		)

		const active = screen.getByRole('tab', { name: 'A' })

		fireEvent.pointerEnter(active)

		fireEvent.focus(active)

		expect(onPreload).not.toHaveBeenCalled()
	})

	it('never fires for a disabled tab', () => {
		const onPreload = vi.fn()

		twoTabs({ onPreload }, { disabled: true })

		fireEvent.pointerEnter(screen.getByRole('tab', { name: 'B' }))

		expect(onPreload).not.toHaveBeenCalled()
	})

	it('composes with a caller onPointerEnter rather than replacing it', () => {
		const onPreload = vi.fn()

		const onPointerEnter = vi.fn()

		twoTabs({ onPreload }, { onPointerEnter })

		fireEvent.pointerEnter(screen.getByRole('tab', { name: 'B' }))

		expect(onPointerEnter).toHaveBeenCalledTimes(1)

		expect(onPreload).toHaveBeenCalledTimes(1)
	})
})

describe('TabContent (idiomatic)', () => {
	function renderContents(panelChildren?: Record<string, ReactNode>) {
		return renderUI(
			<Tabs defaultValue="a">
				<TabList aria-label="Sections">
					<Tab value="a">A</Tab>
					<Tab value="b">B</Tab>
				</TabList>
				<TabContents>
					<TabContent value="a">{panelChildren?.a ?? 'Panel A'}</TabContent>
					<TabContent value="b">{panelChildren?.b ?? 'Panel B'}</TabContent>
				</TabContents>
			</Tabs>,
		)
	}

	it('keeps the auto-wiring when a consumer supplies a competing id and role', () => {
		const { container } = renderUI(
			<Tabs defaultValue="a">
				<TabList aria-label="Sections">
					<Tab value="a">A</Tab>
				</TabList>
				<TabContents>
					<TabContent value="a" id="mine" role="region" tabIndex={-1}>
						Panel A
					</TabContent>
				</TabContents>
			</Tabs>,
		)

		const panel = container.querySelector('[role="tabpanel"]')

		// The tab points at the derived id, so the consumer's must not win. Assert
		// the reciprocal pairing rather than the absence of `mine`.
		expect(panel?.id).toBeTruthy()

		expect(panel?.id).not.toBe('mine')

		expect(screen.getByRole('tab')).toHaveAttribute('aria-controls', panel?.id)
	})

	it('auto-wires each panel as a tabpanel reciprocally linked to its tab', () => {
		renderContents()

		const tab = screen.getByRole('tab', { name: 'A' })

		const panelId = tab.getAttribute('aria-controls')

		expect(panelId).toBeTruthy()

		const panel = document.getElementById(panelId as string)

		expect(panel).toHaveAttribute('role', 'tabpanel')

		// The panel points back at the tab, so the pairing round-trips without the
		// consumer hand-threading ids.
		expect(panel).toHaveAttribute('aria-labelledby', tab.id)
	})

	it('makes a content-only panel keyboard-reachable (tabIndex 0)', () => {
		renderContents()

		const tab = screen.getByRole('tab', { name: 'A' })

		const panel = document.getElementById(tab.getAttribute('aria-controls') as string)

		expect(panel).toHaveAttribute('tabindex', '0')
	})

	it('omits the panel tabIndex when it has its own focusable content', async () => {
		renderContents({ a: <button type="button">Inside</button> })

		const tab = screen.getByRole('tab', { name: 'A' })

		const panel = document.getElementById(tab.getAttribute('aria-controls') as string)

		await waitFor(() => expect(panel).not.toHaveAttribute('tabindex'))
	})

	it('forwards a consumer ref without losing the tabIndex probe', async () => {
		const ref = createRef<HTMLDivElement>()

		renderUI(
			<Tabs defaultValue="a">
				<TabList aria-label="Sections">
					<Tab value="a">A</Tab>
				</TabList>
				<TabContents>
					<TabContent value="a" ref={ref}>
						<button type="button">Inside</button>
					</TabContent>
				</TabContents>
			</Tabs>,
		)

		const panel = screen.getByRole('tabpanel')

		expect(ref.current).toBe(panel)

		await waitFor(() => expect(panel).not.toHaveAttribute('tabindex'))
	})

	it('carries the design-system focus ring, not the browser default', () => {
		renderContents()

		const tab = screen.getByRole('tab', { name: 'A' })

		const panel = document.getElementById(tab.getAttribute('aria-controls') as string)

		expect(panel?.className).toContain('focus-visible:outline-blue-600')
	})
})

describe('TabContents mount policy', () => {
	function renderTabs(props: {
		animate?: 'fade' | 'slide' | false
		mount?: 'always' | 'lazy' | 'active'
	}) {
		return renderUI(
			<Tabs defaultValue="a">
				<TabList aria-label="Sections">
					<Tab value="a">A</Tab>
					<Tab value="b">B</Tab>
				</TabList>
				<TabContents animate={props.animate} mount={props.mount}>
					<TabContent value="a">Panel A</TabContent>
					<TabContent value="b">Panel B</TabContent>
				</TabContents>
			</Tabs>,
		)
	}

	it('mount="active" unmounts inactive panels and drops their tab aria-controls', () => {
		const { container } = renderTabs({ mount: 'active' })

		expect(screen.getByText('Panel A')).toBeInTheDocument()

		expect(screen.queryByText('Panel B')).not.toBeInTheDocument()

		const inactive = container.querySelectorAll('[role="tab"]')[1] as HTMLElement

		expect(inactive).not.toHaveAttribute('aria-controls')
	})

	it('mount="always" with animate=false keeps inactive panels mounted (hidden) and their tab aria-controls', () => {
		const { container } = renderTabs({ mount: 'always', animate: false })

		// Held via <Activity mode="hidden">: in the DOM, but not visible.
		const panelB = screen.getByText('Panel B')

		expect(panelB).toBeInTheDocument()

		expect(panelB).not.toBeVisible()

		// panelsMounted is registered, so the inactive tab still points at its panel.
		const inactive = container.querySelectorAll('[role="tab"]')[1] as HTMLElement

		const controls = inactive.getAttribute('aria-controls')

		expect(controls).toBeTruthy()

		expect(document.getElementById(controls as string)).not.toBeNull()
	})

	it('mount="lazy" leaves never-visited panels unmounted, without a tab aria-controls', () => {
		const { container } = renderTabs({ mount: 'lazy' })

		expect(screen.queryByText('Panel B')).not.toBeInTheDocument()

		const inactive = container.querySelectorAll('[role="tab"]')[1] as HTMLElement

		expect(inactive).not.toHaveAttribute('aria-controls')
	})
})

describe('TabList tabbable floor', () => {
	function FloorTabs({ mode, disabled }: { mode: 'visible' | 'hidden'; disabled?: boolean }) {
		return (
			<Activity mode={mode}>
				{/* No tab matches the value, so no tab takes the Tab stop. */}
				<Tabs value="none" onValueChange={() => {}}>
					<TabList aria-label="Sections">
						<Tab value="a" disabled={disabled}>
							A
						</Tab>
						<Tab value="b">B</Tab>
					</TabList>
				</Tabs>
			</Activity>
		)
	}

	it('makes the first tab tabbable when no tab is current', () => {
		renderUI(<FloorTabs mode="visible" />)

		const [a, b] = screen.getAllByRole('tab')

		expect(a).toHaveAttribute('tabindex', '0')

		expect(b).toHaveAttribute('tabindex', '-1')
	})

	// React detaches the refs and the effects of a hidden Activity and attaches
	// them again when it shows. The floor must hold after each pass.
	it('holds the floor after a hidden Activity shows', async () => {
		const { rerender } = renderUI(<FloorTabs mode="hidden" />)

		rerender(<FloorTabs mode="visible" />)

		const [a] = screen.getAllByRole('tab', { hidden: true })

		expect(a).toHaveAttribute('tabindex', '0')

		rerender(<FloorTabs mode="hidden" />)

		rerender(<FloorTabs mode="visible" />)

		// The observer runs again: a disabled first tab moves the floor to the next tab.
		rerender(<FloorTabs mode="visible" disabled />)

		const [, b] = screen.getAllByRole('tab')

		await waitFor(() => expect(b).toHaveAttribute('tabindex', '0'))
	})

	it('stops the observer while the Activity is hidden', async () => {
		const { rerender } = renderUI(<FloorTabs mode="visible" />)

		rerender(<FloorTabs mode="hidden" />)

		rerender(<FloorTabs mode="hidden" disabled />)

		const [, b] = screen.getAllByRole('tab', { hidden: true })

		// A mutation while hidden reaches no observer.
		await act(async () => {
			await Promise.resolve()
		})

		expect(b).toHaveAttribute('tabindex', '-1')

		rerender(<FloorTabs mode="visible" disabled />)

		expect(b).toHaveAttribute('tabindex', '0')
	})
})

describe('TabList variants', () => {
	it('renders TabList without a Tabs wrapper', () => {
		const { container } = renderUI(
			<TabList aria-label="Tabs">
				<button type="button" role="tab">
					Standalone
				</button>
			</TabList>,
		)

		const list = bySlot(container, 'tab-list')

		expect(list).toBeInTheDocument()

		expect(list).toHaveAttribute('data-orientation', 'horizontal')
	})
})

describe('Tabs keyboard navigation', () => {
	const tab = (name: string) => screen.getByRole('tab', { name })

	function renderTabs() {
		renderUI(
			<Tabs defaultValue="a">
				<TabList aria-label="Tabs">
					<Tab value="a">A</Tab>
					<Tab value="b" disabled>
						B
					</Tab>
					<Tab value="c">C</Tab>
				</TabList>
				<TabContents>
					<TabContent value="a">PA</TabContent>
					<TabContent value="b">PB</TabContent>
					<TabContent value="c">PC</TabContent>
				</TabContents>
			</Tabs>,
		)
	}

	it('moves focus with arrows, skipping the disabled tab', async () => {
		const user = setupUser()

		renderTabs()

		act(() => tab('A').focus())

		await user.keyboard('{ArrowRight}')

		expect(tab('C')).toHaveFocus()

		await user.keyboard('{ArrowLeft}')

		expect(tab('A')).toHaveFocus()
	})

	it('jumps to the first and last tab with Home / End', async () => {
		const user = setupUser()

		renderTabs()

		act(() => tab('A').focus())

		await user.keyboard('{End}')

		expect(tab('C')).toHaveFocus()

		await user.keyboard('{Home}')

		expect(tab('A')).toHaveFocus()
	})
})

// Selection is the activation a tab exists to perform, so a consumer
// `preventDefault()` does not cancel it. The preload is side behavior, so it
// does (CONVENTIONS.md §3.9).
describe('Tab handler composition', () => {
	function twoTabs(props: { onPreload?: (value: string | undefined) => void }, extra = {}) {
		const onValueChange = vi.fn()

		renderUI(
			<Tabs value="a" onValueChange={onValueChange}>
				<TabList aria-label="Sections">
					<Tab value="a">A</Tab>
					<Tab value="b" onPreload={props.onPreload} {...extra}>
						B
					</Tab>
				</TabList>
			</Tabs>,
		)

		return { onValueChange, inactive: screen.getByRole('tab', { name: 'B' }) }
	}

	it('selects the tab when a consumer onClick prevents the default', () => {
		const { onValueChange, inactive } = twoTabs(
			{},
			{ onClick: (event: { preventDefault: () => void }) => event.preventDefault() },
		)

		fireEvent.click(inactive)

		expect(onValueChange).toHaveBeenCalledWith('b')
	})

	it.each([
		['onPointerEnter', (el: HTMLElement) => fireEvent.pointerEnter(el)],
		['onFocus', (el: HTMLElement) => fireEvent.focus(el)],
	] as const)('skips the preload when a consumer %s prevents the default', (prop, intent) => {
		const onPreload = vi.fn()

		const { inactive } = twoTabs(
			{ onPreload },
			{ [prop]: (event: { preventDefault: () => void }) => event.preventDefault() },
		)

		intent(inactive)

		expect(onPreload).not.toHaveBeenCalled()
	})
})

// The native `defaultValue` of the `<div>` is wider than the selection value.
// Without an Omit, the intersection prints as `string | (readonly string[] & string)`.
describe('Tabs selection value types', () => {
	it('types defaultValue as a plain string', () => {
		expectTypeOf<TabsProps['defaultValue']>().toEqualTypeOf<string | undefined>()
	})
})
