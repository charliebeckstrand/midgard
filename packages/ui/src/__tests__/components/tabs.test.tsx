import { describe, expect, it } from 'vitest'
import { Tab, TabList, TabPanel, TabPanels, Tabs } from '../../components/tabs'
import { Density } from '../../providers/density'
import { bySlot, renderUI, screen } from '../helpers'

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
})
