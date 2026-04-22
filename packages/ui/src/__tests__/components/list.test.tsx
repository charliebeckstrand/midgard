import { describe, expect, it } from 'vitest'
import { List, ListDescription, ListItem, ListLabel } from '../../components/list'
import { allBySlot, bySlot, renderUI, screen } from '../helpers'

type Item = { id: string; label: string }

const items: Item[] = [
	{ id: 'a', label: 'Alpha' },
	{ id: 'b', label: 'Bravo' },
	{ id: 'c', label: 'Charlie' },
]

describe('List', () => {
	it('renders with data-slot="list"', () => {
		const { container } = renderUI(
			<List items={items} getKey={(i) => i.id}>
				{(item) => <ListItem>{item.label}</ListItem>}
			</List>,
		)

		const el = bySlot(container, 'list')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('UL')
	})

	it('renders one list item per input', () => {
		const { container } = renderUI(
			<List items={items} getKey={(i) => i.id}>
				{(item) => <ListItem>{item.label}</ListItem>}
			</List>,
		)

		expect(allBySlot(container, 'list-item')).toHaveLength(items.length)
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<List items={items} getKey={(i) => i.id} className="custom">
				{(item) => <ListItem>{item.label}</ListItem>}
			</List>,
		)

		const el = bySlot(container, 'list')

		expect(el?.className).toContain('custom')
	})

	it('reflects orientation on data attribute', () => {
		const { container } = renderUI(
			<List items={items} getKey={(i) => i.id} orientation="horizontal">
				{(item) => <ListItem>{item.label}</ListItem>}
			</List>,
		)

		const el = bySlot(container, 'list')

		expect(el).toHaveAttribute('data-orientation', 'horizontal')
	})
})

describe('ListItem', () => {
	it('renders with data-slot="list-item"', () => {
		const { container } = renderUI(
			<List items={items.slice(0, 1)} getKey={(i) => i.id}>
				{(item) => <ListItem>{item.label}</ListItem>}
			</List>,
		)

		const el = bySlot(container, 'list-item')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('LI')
	})

	it('exposes the stable item id via data-item-id', () => {
		const { container } = renderUI(
			<List items={items.slice(0, 1)} getKey={(i) => i.id}>
				{(item) => <ListItem>{item.label}</ListItem>}
			</List>,
		)

		const el = bySlot(container, 'list-item')

		expect(el).toHaveAttribute('data-item-id', 'a')
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<List items={items.slice(0, 1)} getKey={(i) => i.id}>
				{(item) => <ListItem className="custom">{item.label}</ListItem>}
			</List>,
		)

		const el = bySlot(container, 'list-item')

		expect(el?.className).toContain('custom')
	})
})

describe('ListLabel', () => {
	it('renders with data-slot="list-label"', () => {
		const { container } = renderUI(<ListLabel>Alpha</ListLabel>)

		expect(bySlot(container, 'list-label')).toBeInTheDocument()

		expect(screen.getByText('Alpha')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<ListLabel className="custom">Alpha</ListLabel>)

		const el = bySlot(container, 'list-label')

		expect(el?.className).toContain('custom')
	})
})

describe('ListDescription', () => {
	it('renders with data-slot="list-description"', () => {
		const { container } = renderUI(<ListDescription>Help</ListDescription>)

		expect(bySlot(container, 'list-description')).toBeInTheDocument()

		expect(screen.getByText('Help')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<ListDescription className="custom">Help</ListDescription>)

		const el = bySlot(container, 'list-description')

		expect(el?.className).toContain('custom')
	})
})
