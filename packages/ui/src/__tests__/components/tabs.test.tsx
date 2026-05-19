import { describe, expect, it, vi } from 'vitest'
import { Tab, TabList, TabPanel, TabPanels, Tabs } from '../../components/tabs'
import { Density } from '../../providers/density'
import { bySlot, fireEvent, renderUI, screen, userEvent } from '../helpers'

describe('Tabs', () => {
	it('renders with data-slot="tab-group"', () => {
		const { container } = renderUI(
			<Tabs defaultValue="a">
				<TabList>
					<Tab value="a">Tab A</Tab>
				</TabList>
				<TabPanels>
					<TabPanel>Panel A</TabPanel>
				</TabPanels>
			</Tabs>,
		)

		const el = bySlot(container, 'tab-group')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('DIV')
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<Tabs defaultValue="a" className="custom">
				<TabList>
					<Tab value="a">Tab A</Tab>
				</TabList>
				<TabPanels>
					<TabPanel>Panel A</TabPanel>
				</TabPanels>
			</Tabs>,
		)

		const el = bySlot(container, 'tab-group')

		expect(el?.className).toContain('custom')
	})
})

describe('TabList', () => {
	it('renders with data-slot="tab-list" and role="tablist"', () => {
		const { container } = renderUI(
			<Tabs defaultValue="a">
				<TabList>
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

	it('reflects vertical orientation on tab-group and tab-list', () => {
		const { container } = renderUI(
			<Tabs defaultValue="a" orientation="vertical">
				<TabList>
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
				<TabList>
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

	it('renders children', () => {
		renderUI(
			<Tabs defaultValue="a">
				<TabList>
					<Tab value="a">My Tab</Tab>
				</TabList>
				<TabPanels>
					<TabPanel>Panel A</TabPanel>
				</TabPanels>
			</Tabs>,
		)

		expect(screen.getByText('My Tab')).toBeInTheDocument()
	})

	it('inherits size from ambient Density when wrapped in <Tabs>', () => {
		const { container } = renderUI(
			<Density density="compact">
				<Tabs defaultValue="a">
					<TabList>
						<Tab value="a">Tab A</Tab>
					</TabList>
				</Tabs>
			</Density>,
		)

		// Compact density → 'sm' → text-sm + pb-3 from the recipe.
		const tab = bySlot(container, 'tab')

		expect(tab?.className).toContain('text-sm')

		expect(tab?.className).toContain('pb-3')
	})

	it('inherits size from ambient Density when used à la carte (TabList + Tab without <Tabs>)', () => {
		const { container } = renderUI(
			<Density density="loose">
				<TabList>
					<Tab current>Tab A</Tab>
				</TabList>
			</Density>,
		)

		// Loose density → 'lg' → text-lg + pb-5 from the recipe.
		const tab = bySlot(container, 'tab')

		expect(tab?.className).toContain('text-lg')

		expect(tab?.className).toContain('pb-5')
	})

	it('falls back to md when neither <Tabs> nor Density is present', () => {
		const { container } = renderUI(
			<TabList>
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
				<TabList>
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
				<TabList>
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
			<TabList>
				<Tab onClick={onClick}>Standalone</Tab>
			</TabList>,
		)

		const tab = bySlot(container, 'tab') as HTMLElement

		fireEvent.click(tab)

		expect(onClick).toHaveBeenCalled()
	})

	it('wires aria-controls when a Tab id is provided', () => {
		const { container } = renderUI(
			<TabList>
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
				<TabList>
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
			<TabList>
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
				<TabList>
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

	it('renders children', () => {
		renderUI(
			<Tabs defaultValue="a">
				<TabList>
					<Tab value="a">Tab A</Tab>
				</TabList>
				<TabPanels>
					<TabPanel>Panel Content</TabPanel>
				</TabPanels>
			</Tabs>,
		)

		expect(screen.getByText('Panel Content')).toBeInTheDocument()
	})

	it('derives id and aria-labelledby from the provided id prop', () => {
		const { container } = renderUI(
			<Tabs defaultValue="a">
				<TabList>
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
})

describe('TabList variants', () => {
	it('renders TabList with vertical orientation from Tabs', () => {
		const { container } = renderUI(
			<Tabs orientation="vertical" defaultValue="a">
				<TabList>
					<Tab value="a">A</Tab>
				</TabList>
			</Tabs>,
		)

		expect(bySlot(container, 'tab-list')).toHaveAttribute('data-orientation', 'vertical')
	})

	it('renders TabList without a Tabs wrapper', () => {
		const { container } = renderUI(
			<TabList>
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
				<TabList>
					<Tab value="a">A</Tab>
				</TabList>
			</Tabs>,
		)

		expect(bySlot(container, 'tab-list')).toBeInTheDocument()
	})
})
