import { describe, expect, it } from 'vitest'
import { Tab, TabList, TabPanel, TabPanels, Tabs } from '../../components/tabs'
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
