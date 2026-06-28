import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
	Tab,
	TabContent,
	TabContents,
	TabList,
	TabListSkeleton,
	TabPanel,
	TabPanels,
	Tabs,
} from '../../components/tabs'
import { scrollIntoViewOffset } from '../../components/tabs/use-tab-list-scroll'
import { DensityProvider } from '../../providers/density'
import { act, allBySlot, bySlot, fireEvent, renderUI, screen, userEvent, waitFor } from '../helpers'

describe('TabList', () => {
	it('pairs with an explicit TabListSkeleton in loading trees', () => {
		const { container } = renderUI(<TabListSkeleton tabs={4} />)

		expect(bySlot(container, 'tab')).not.toBeInTheDocument()

		expect(allBySlot(container, 'placeholder')).toHaveLength(4)
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

	it('keeps aria-controls on inactive tabs while fade panels stay mounted', () => {
		const { container } = renderUI(
			<Tabs value="a" onValueChange={() => {}}>
				<TabList aria-label="Sections">
					<Tab value="a">A</Tab>
					<Tab value="b">B</Tab>
				</TabList>
				<TabContents>
					<TabContent value="a">Panel A</TabContent>
					<TabContent value="b">Panel B</TabContent>
				</TabContents>
			</Tabs>,
		)

		const tabs = container.querySelectorAll('[role="tab"]')

		// Default fade mode keeps inactive panels mounted, so the inactive tab's
		// reference resolves instead of being omitted.
		const inactive = tabs[1] as HTMLElement

		const controls = inactive.getAttribute('aria-controls')

		expect(controls).toBeTruthy()

		expect(document.getElementById(controls as string)).not.toBeNull()
	})

	it('renders with data-slot="tab-list" and role="tablist"', () => {
		const { container } = renderUI(
			<Tabs defaultValue="a">
				<TabList aria-label="Tabs">
					<Tab value="a">Tab A</Tab>
				</TabList>
				<TabPanels>
					<TabPanel>Panel A</TabPanel>
				</TabPanels>
			</Tabs>,
		)

		const el = bySlot(container, 'tab-list')

		expect(el).toBeInTheDocument()

		expect(el).toHaveAttribute('role', 'tablist')
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
				<TabPanels>
					<TabPanel>Panel A</TabPanel>
				</TabPanels>
			</Tabs>,
		)

		expect(bySlot(container, 'tab-group')).toHaveAttribute('data-orientation', 'vertical')

		const list = bySlot(container, 'tab-list')

		expect(list).toHaveAttribute('data-orientation', 'vertical')

		expect(list).toHaveAttribute('aria-orientation', 'vertical')
	})
})

describe('Tab', () => {
	it('renders with data-slot="tab" and role="tab"', () => {
		const { container } = renderUI(
			<Tabs defaultValue="a">
				<TabList aria-label="Tabs">
					<Tab value="a">Tab A</Tab>
				</TabList>
				<TabPanels>
					<TabPanel>Panel A</TabPanel>
				</TabPanels>
			</Tabs>,
		)

		const el = bySlot(container, 'tab')

		expect(el).toBeInTheDocument()

		expect(el).toHaveAttribute('role', 'tab')
	})

	it('inherits size from ambient Density when wrapped in <Tabs>', () => {
		const { container } = renderUI(
			<DensityProvider density="compact">
				<Tabs defaultValue="a">
					<TabList aria-label="Tabs">
						<Tab value="a">Tab A</Tab>
					</TabList>
				</Tabs>
			</DensityProvider>,
		)

		// Compact density → 'sm' → text-sm + pb-3 from the recipe.
		const tab = bySlot(container, 'tab')

		expect(tab?.className).toContain('text-sm')

		expect(tab?.className).toContain('pb-3')
	})

	it('inherits size from ambient Density when used à la carte (TabList + Tab without <Tabs>)', () => {
		const { container } = renderUI(
			<DensityProvider density="loose">
				<TabList aria-label="Tabs">
					<Tab current>Tab A</Tab>
				</TabList>
			</DensityProvider>,
		)

		// Loose density → 'lg' → text-lg + pb-5 from the recipe.
		const tab = bySlot(container, 'tab')

		expect(tab?.className).toContain('text-lg')

		expect(tab?.className).toContain('pb-5')
	})

	it('falls back to md when neither <Tabs> nor Density is present', () => {
		const { container } = renderUI(
			<TabList aria-label="Tabs">
				<Tab current>Tab A</Tab>
			</TabList>,
		)

		const tab = bySlot(container, 'tab')

		expect(tab?.className).toContain('text-base')

		expect(tab?.className).toContain('pb-4')
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

		const user = userEvent.setup()

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

		const tab = bySlot(container, 'tab') as HTMLElement

		fireEvent.click(tab)

		expect(onClick).toHaveBeenCalled()
	})

	it('wires aria-controls when a Tab id is provided', () => {
		const { container } = renderUI(
			<TabList aria-label="Tabs">
				<Tab id="settings">Settings</Tab>
			</TabList>,
		)

		const tab = bySlot(container, 'tab') as HTMLElement

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

	it('applies a custom className on Tab', () => {
		const { container } = renderUI(
			<TabList aria-label="Tabs">
				<Tab className="my-tab">A</Tab>
			</TabList>,
		)

		expect(bySlot(container, 'tab')?.className).toContain('my-tab')
	})
})

describe('TabPanel', () => {
	it('renders with data-slot="tab-panel" and role="tabpanel"', () => {
		const { container } = renderUI(
			<Tabs defaultValue="a">
				<TabList aria-label="Tabs">
					<Tab value="a">Tab A</Tab>
				</TabList>
				<TabPanels>
					<TabPanel>Panel A</TabPanel>
				</TabPanels>
			</Tabs>,
		)

		const el = bySlot(container, 'tab-panel')

		expect(el).toBeInTheDocument()

		expect(el).toHaveAttribute('role', 'tabpanel')
	})

	it('derives id and aria-labelledby from the provided id prop', () => {
		const { container } = renderUI(
			<Tabs defaultValue="a">
				<TabList aria-label="Tabs">
					<Tab value="a">Tab A</Tab>
				</TabList>
				<TabPanels>
					<TabPanel id="t1">Panel A</TabPanel>
				</TabPanels>
			</Tabs>,
		)

		const panel = bySlot(container, 'tab-panel')

		expect(panel).toHaveAttribute('id', 't1-panel')

		expect(panel).toHaveAttribute('aria-labelledby', 't1')
	})

	it('carries the design-system focus ring, not the browser default', () => {
		const { container } = renderUI(
			<Tabs defaultValue="a">
				<TabList aria-label="Tabs">
					<Tab value="a">Tab A</Tab>
				</TabList>
				<TabPanels>
					<TabPanel>Panel A</TabPanel>
				</TabPanels>
			</Tabs>,
		)

		expect(bySlot(container, 'tab-panel')?.className).toContain('focus-visible:outline-blue-600')
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

	it('makes a content-only panel keyboard-reachable (tabIndex 0)', async () => {
		renderContents()

		const tab = screen.getByRole('tab', { name: 'A' })

		const panel = document.getElementById(tab.getAttribute('aria-controls') as string)

		await waitFor(() => expect(panel).toHaveAttribute('tabindex', '0'))
	})

	it('omits the panel tabIndex when it has its own focusable content', async () => {
		renderContents({ a: <button type="button">Inside</button> })

		const tab = screen.getByRole('tab', { name: 'A' })

		const panel = document.getElementById(tab.getAttribute('aria-controls') as string)

		await waitFor(() => expect(panel).not.toHaveAttribute('tabindex'))
	})

	it('carries the design-system focus ring, not the browser default', () => {
		renderContents()

		const tab = screen.getByRole('tab', { name: 'A' })

		const panel = document.getElementById(tab.getAttribute('aria-controls') as string)

		expect(panel?.className).toContain('focus-visible:outline-blue-600')
	})
})

describe('TabList variants', () => {
	it('renders TabList with vertical orientation from Tabs', () => {
		const { container } = renderUI(
			<Tabs orientation="vertical" defaultValue="a">
				<TabList aria-label="Tabs">
					<Tab value="a">A</Tab>
				</TabList>
			</Tabs>,
		)

		expect(bySlot(container, 'tab-list')).toHaveAttribute('data-orientation', 'vertical')
	})

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

	it('renders TabList with segment variant from Tabs', () => {
		const { container } = renderUI(
			<Tabs variant="segment" defaultValue="a">
				<TabList aria-label="Tabs">
					<Tab value="a">A</Tab>
				</TabList>
			</Tabs>,
		)

		expect(bySlot(container, 'tab-list')).toBeInTheDocument()
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
				<TabPanels>
					<TabPanel>PA</TabPanel>
					<TabPanel>PB</TabPanel>
					<TabPanel>PC</TabPanel>
				</TabPanels>
			</Tabs>,
		)
	}

	it('moves focus with arrows, skipping the disabled tab', async () => {
		const user = userEvent.setup()

		renderTabs()

		act(() => tab('A').focus())

		await user.keyboard('{ArrowRight}')

		expect(tab('C')).toHaveFocus()

		await user.keyboard('{ArrowLeft}')

		expect(tab('A')).toHaveFocus()
	})

	it('jumps to the first and last tab with Home / End', async () => {
		const user = userEvent.setup()

		renderTabs()

		act(() => tab('A').focus())

		await user.keyboard('{End}')

		expect(tab('C')).toHaveFocus()

		await user.keyboard('{Home}')

		expect(tab('A')).toHaveFocus()
	})
})

describe('scrollIntoViewOffset', () => {
	it('leaves the offset unchanged when the tab already fits', () => {
		expect(scrollIntoViewOffset({ viewport: 100, current: 10, extent: 30, leading: 20 })).toBe(10)
	})

	it('scrolls back when the tab starts before the viewport', () => {
		expect(scrollIntoViewOffset({ viewport: 100, current: 50, extent: 30, leading: -15 })).toBe(35)
	})

	it('scrolls forward the minimum to reveal a tab past the trailing edge', () => {
		// leading 80 + extent 40 overruns the 100 viewport by 20; align the trailing edge.
		expect(scrollIntoViewOffset({ viewport: 100, current: 0, extent: 40, leading: 80 })).toBe(20)
	})

	it('treats a tab flush with either edge as already visible', () => {
		expect(scrollIntoViewOffset({ viewport: 100, current: 0, extent: 40, leading: 0 })).toBe(0)

		expect(scrollIntoViewOffset({ viewport: 100, current: 0, extent: 40, leading: 60 })).toBe(0)
	})
})
