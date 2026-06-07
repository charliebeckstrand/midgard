import { describe, expect, it, vi } from 'vitest'
import { List, ListDescription, ListItem, ListLabel } from '../../components/list'
import { Density } from '../../primitives/density'
import { DensityProvider } from '../../providers/density'
import { allBySlot, bySlot, fireEvent, renderUI, screen } from '../helpers'

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
})

describe('ListLabel', () => {
	it('renders with data-slot="list-label"', () => {
		const { container } = renderUI(<ListLabel>Alpha</ListLabel>)

		expect(bySlot(container, 'list-label')).toBeInTheDocument()

		expect(screen.getByText('Alpha')).toBeInTheDocument()
	})
})

describe('ListDescription', () => {
	it('renders with data-slot="list-description"', () => {
		const { container } = renderUI(<ListDescription>Help</ListDescription>)

		expect(bySlot(container, 'list-description')).toBeInTheDocument()

		expect(screen.getByText('Help')).toBeInTheDocument()
	})
})

describe('List keyboard reordering', () => {
	function renderList(onReorder: (next: Item[]) => void = () => {}) {
		return renderUI(
			<List items={items} getKey={(i) => i.id} sortable onReorder={onReorder}>
				{(item) => <ListItem>{item.label}</ListItem>}
			</List>,
		)
	}

	it('focuses the next item on ArrowDown when not lifted', () => {
		const { container } = renderList()

		const [first, second] = allBySlot(container, 'list-item')

		first?.focus()

		fireEvent.keyDown(first as HTMLElement, { key: 'ArrowDown' })

		expect(document.activeElement).toBe(second)
	})

	it('focuses the previous item on ArrowUp when not lifted', () => {
		const { container } = renderList()

		const listItems = allBySlot(container, 'list-item')

		listItems[1]?.focus()

		fireEvent.keyDown(listItems[1] as HTMLElement, { key: 'ArrowUp' })

		expect(document.activeElement).toBe(listItems[0])
	})

	it('jumps to the first item on Home', () => {
		const { container } = renderList()

		const listItems = allBySlot(container, 'list-item')

		listItems[2]?.focus()

		fireEvent.keyDown(listItems[2] as HTMLElement, { key: 'Home' })

		expect(document.activeElement).toBe(listItems[0])
	})

	it('jumps to the last item on End', () => {
		const { container } = renderList()

		const listItems = allBySlot(container, 'list-item')

		listItems[0]?.focus()

		fireEvent.keyDown(listItems[0] as HTMLElement, { key: 'End' })

		expect(document.activeElement).toBe(listItems[2])
	})

	it('moves a lifted item down with ArrowDown and calls onReorder', () => {
		const onReorder = vi.fn()

		const { container } = renderList(onReorder)

		const first = allBySlot(container, 'list-item')[0] as HTMLElement

		first.focus()

		fireEvent.keyDown(first, { key: ' ' })
		fireEvent.keyDown(first, { key: 'ArrowDown' })

		expect(onReorder).toHaveBeenCalledOnce()

		expect(onReorder.mock.calls[0]?.[0].map((i: Item) => i.id)).toEqual(['b', 'a', 'c'])
	})

	it('moves a lifted item up with ArrowUp and calls onReorder', () => {
		const onReorder = vi.fn()

		const { container } = renderList(onReorder)

		const last = allBySlot(container, 'list-item')[2] as HTMLElement

		last.focus()

		fireEvent.keyDown(last, { key: ' ' })
		fireEvent.keyDown(last, { key: 'ArrowUp' })

		expect(onReorder.mock.calls[0]?.[0].map((i: Item) => i.id)).toEqual(['a', 'c', 'b'])
	})

	it('ignores navigation when modifier keys are pressed', () => {
		const { container } = renderList()

		const first = allBySlot(container, 'list-item')[0] as HTMLElement

		first.focus()

		fireEvent.keyDown(first, { key: 'ArrowDown', shiftKey: true })

		expect(document.activeElement).toBe(first)
	})
})

describe('List: static (non-interactive) mode', () => {
	it('falls back to index-based keys when no getKey is supplied to a read-only list', () => {
		const { container } = renderUI(
			<List items={items} sortable={false}>
				{(item) => <ListItem>{item.label}</ListItem>}
			</List>,
		)

		// Static list still renders one item per input.
		expect(allBySlot(container, 'list-item')).toHaveLength(items.length)
	})

	it('renders a non-interactive list when sortable is true but onReorder is omitted', () => {
		const { container } = renderUI(
			<List items={items} getKey={(i) => i.id}>
				{(item) => <ListItem>{item.label}</ListItem>}
			</List>,
		)

		// Read-only sortable lists still render every item.
		expect(allBySlot(container, 'list-item')).toHaveLength(items.length)
	})
})

describe('ListItem density inheritance', () => {
	// Card variants (separated/outline/solid) use the uniform ma.p scale
	// (sm p-2 / md p-3 / lg p-4); `plain` keeps a tighter px/py ratio.
	function firstItemClass(ui: Parameters<typeof renderUI>[0]) {
		const { container } = renderUI(ui)

		return bySlot(container, 'list-item')?.className ?? ''
	}

	const list = () => (
		<List items={items} getKey={(i) => i.id}>
			{(item) => <ListItem>{item.label}</ListItem>}
		</List>
	)

	it('defaults the card variant to md uniform padding', () => {
		expect(firstItemClass(list())).toMatch(/(^|\s)p-3(\s|$)/)
	})

	it('inherits a compact DensityProvider on the card variant', () => {
		expect(firstItemClass(<DensityProvider density="compact">{list()}</DensityProvider>)).toMatch(
			/(^|\s)p-2(\s|$)/,
		)
	})

	it('tracks the density axis under a two-axis Density (size does not affect padding)', () => {
		const cls = firstItemClass(
			<Density density="lg" size="sm">
				{list()}
			</Density>,
		)

		expect(cls).toMatch(/(^|\s)p-4(\s|$)/)
	})

	it('keeps the plain variant on its tighter px/py ratio, dropping the shadowed p-*', () => {
		const cls = firstItemClass(
			<List items={items} getKey={(i) => i.id} variant="plain">
				{(item) => <ListItem>{item.label}</ListItem>}
			</List>,
		)

		expect(cls).toMatch(/(^|\s)px-2(\s|$)/)

		expect(cls).toMatch(/(^|\s)py-1\.5(\s|$)/)

		// twMerge drops the card padding the density axis would otherwise add.
		expect(cls).not.toMatch(/(^|\s)p-3(\s|$)/)
	})

	it('tightens the plain variant under a compact DensityProvider', () => {
		const cls = firstItemClass(
			<DensityProvider density="compact">
				<List items={items} getKey={(i) => i.id} variant="plain">
					{(item) => <ListItem>{item.label}</ListItem>}
				</List>
			</DensityProvider>,
		)

		expect(cls).toMatch(/(^|\s)px-1\.5(\s|$)/)

		expect(cls).toMatch(/(^|\s)py-1(\s|$)/)
	})
})
