import { describe, expect, it, vi } from 'vitest'
import { List, ListDescription, ListItem, ListLabel } from '../../components/list'
import { Density } from '../../primitives/density'
import { DensityProvider } from '../../providers/density'
import { allBySlot, bySlot, expectAnnouncement, fireEvent, renderUI, screen } from '../helpers'

type Item = { id: string; label: string }

const items: Item[] = [
	{ id: 'a', label: 'Alpha' },
	{ id: 'b', label: 'Bravo' },
	{ id: 'c', label: 'Charlie' },
]

describe('List', () => {
	it('requires getKey for reorderable configurations (compile-time)', () => {
		// Never rendered; exists for `tsc`. The index-key fallback produces
		// positional keys that change on reorder, remounting items mid-drag, so
		// `onReorder` without `getKey` must not typecheck.
		const typeChecks = () => (
			// @ts-expect-error: onReorder requires getKey
			<List items={items} sortable={false} onReorder={() => {}}>
				{(item) => <ListItem>{item.label}</ListItem>}
			</List>
		)

		expect(typeChecks).toBeTypeOf('function')
	})

	it('renders a data-slot="list" ul with one list item per input', () => {
		const { container } = renderUI(
			<List items={items} getKey={(i) => i.id}>
				{(item) => <ListItem>{item.label}</ListItem>}
			</List>,
		)

		const el = bySlot(container, 'list')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('UL')

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
	it('renders a data-slot="list-item" li exposing the stable item id via data-item-id', () => {
		const { container } = renderUI(
			<List items={items.slice(0, 1)} getKey={(i) => i.id}>
				{(item) => <ListItem>{item.label}</ListItem>}
			</List>,
		)

		const el = bySlot(container, 'list-item')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('LI')

		expect(bySlot(container, 'list-item')).toHaveAttribute('data-item-id', 'a')
	})

	it('renders the content as a div by default', () => {
		const { container } = renderUI(
			<List items={items.slice(0, 1)} getKey={(i) => i.id}>
				{(item) => <ListItem>{item.label}</ListItem>}
			</List>,
		)

		const content = bySlot(container, 'list-item-content')

		expect(content?.tagName).toBe('DIV')
	})

	it('renders the content as the requested element via as', () => {
		const { container } = renderUI(
			<List items={items.slice(0, 1)} getKey={(i) => i.id}>
				{(item) => <ListItem as="button">{item.label}</ListItem>}
			</List>,
		)

		const content = bySlot(container, 'list-item-content')

		expect(content?.tagName).toBe('BUTTON')

		// Polymorphic stamps type="button" on a rendered <button>.
		expect(content).toHaveAttribute('type', 'button')
	})

	it('renders the content as a link when href is provided, keeping the li wrapper', () => {
		const { container } = renderUI(
			<List items={items.slice(0, 1)} getKey={(i) => i.id}>
				{(item) => <ListItem href="/path">{item.label}</ListItem>}
			</List>,
		)

		// The wrapper stays an <li>; only the inner content switches to the link.
		expect(bySlot(container, 'list-item')?.tagName).toBe('LI')

		const content = bySlot(container, 'list-item-content')

		expect(content?.tagName).toBe('A')

		expect(content).toHaveAttribute('href', '/path')
	})

	it('mutes linked content at rest and steps to the strong neutral on hover', () => {
		const { container } = renderUI(
			<List items={items.slice(0, 1)} getKey={(i) => i.id}>
				{(item) => <ListItem href="/path">{item.label}</ListItem>}
			</List>,
		)

		const cls = bySlot(container, 'list-item-content')?.className ?? ''

		expect(cls).toMatch(/(^|\s)text-zinc-500(\s|$)/)

		expect(cls).toMatch(/(^|\s)dark:text-zinc-400(\s|$)/)

		expect(cls).toContain('hover:not-disabled:text-zinc-950')

		expect(cls).toContain('dark:hover:not-disabled:text-white')
	})

	it('gives clickable content the same treatment as a link, plus the pointer', () => {
		const { container } = renderUI(
			<List items={items.slice(0, 1)} getKey={(i) => i.id}>
				{(item) => (
					<ListItem as="button" onClick={vi.fn()}>
						{item.label}
					</ListItem>
				)}
			</List>,
		)

		const cls = bySlot(container, 'list-item-content')?.className ?? ''

		expect(cls).toMatch(/(^|\s)text-zinc-500(\s|$)/)

		expect(cls).toContain('hover:not-disabled:text-zinc-950')

		expect(cls).toContain('dark:hover:not-disabled:text-white')

		expect(cls).toContain('cursor-pointer')
	})

	it('reads a conditional handler by its value, not by the key it leaves behind', () => {
		// `onClick={enabled ? open : undefined}` keeps the key on an inert row, so a
		// key-presence test would promise a pointer the row never honours.
		const { container } = renderUI(
			<List items={items.slice(0, 1)} getKey={(i) => i.id}>
				{(item) => (
					<ListItem as="button" onClick={undefined}>
						{item.label}
					</ListItem>
				)}
			</List>,
		)

		const cls = bySlot(container, 'list-item-content')?.className ?? ''

		expect(cls).not.toContain('text-zinc-500')

		expect(cls).not.toContain('cursor-pointer')
	})

	it('keeps inert content on the inherited item color', () => {
		const { container } = renderUI(
			<List items={items.slice(0, 1)} getKey={(i) => i.id}>
				{(item) => <ListItem>{item.label}</ListItem>}
			</List>,
		)

		const cls = bySlot(container, 'list-item-content')?.className ?? ''

		expect(cls).not.toContain('text-zinc-500')

		expect(cls).not.toContain('hover:not-disabled:text-zinc-950')
	})

	it('forwards HTML attributes to the content element', () => {
		const { container } = renderUI(
			<List items={items.slice(0, 1)} getKey={(i) => i.id}>
				{(item) => <ListItem id="content-id">{item.label}</ListItem>}
			</List>,
		)

		expect(bySlot(container, 'list-item-content')).toHaveAttribute('id', 'content-id')
	})

	/** One interactive row of a variant, so each wash can be read off its `<li>`. */
	function washOf(variant: 'separated' | 'outline' | 'plain' | 'solid'): string {
		const { container } = renderUI(
			<List items={items.slice(0, 1)} variant={variant} getKey={(i) => i.id}>
				{(item) => (
					<ListItem as="button" onClick={vi.fn()}>
						{item.label}
					</ListItem>
				)}
			</List>,
		)

		return bySlot(container, 'list-item')?.className ?? ''
	}

	it('washes a row on bare ground with the standard tint, doubled inside a glass parent', () => {
		for (const variant of ['plain', 'outline'] as const) {
			const cls = washOf(variant)

			expect(cls).toContain('not-disabled:not-data-disabled:hover:bg-zinc-950/5')

			expect(cls).toContain(
				'dark:group-data-[glass]/glass:not-disabled:not-data-disabled:hover:bg-white/10',
			)
		}
	})

	it('steps a card to the neighbouring shade rather than washing its surface away', () => {
		const cls = washOf('separated')

		// An alpha wash replaces `omote.bg.surface` instead of darkening it, so the
		// card would go see-through to whatever it covers while the pointer rests on
		// it. The hover has to stay opaque.
		expect(cls).toContain('not-disabled:not-data-disabled:hover:bg-zinc-50')

		expect(cls).toContain('dark:not-disabled:not-data-disabled:hover:bg-zinc-800')

		expect(cls).not.toContain('hover:bg-white/5')

		expect(cls).not.toContain('hover:bg-zinc-950/5')
	})

	it('steps the solid row’s wash past the fill it already rests on', () => {
		const cls = washOf('solid')

		// Double the `omote.bg.tint` the row rests on, in each mode.
		expect(cls).toContain('not-disabled:not-data-disabled:hover:bg-zinc-950/10')

		expect(cls).toContain('dark:not-disabled:not-data-disabled:hover:bg-white/20')

		expect(cls).not.toContain('hover:bg-white/5')
	})

	it('keeps the glass allowance off the variants that carry their own fill', () => {
		// `glassItem` outranks a plain wash by selector, so a filled row that emitted
		// both would take the ambient 10% — which on a solid dark row is the fill
		// repainted, and on a card is the surface gone.
		for (const variant of ['separated', 'solid'] as const) {
			expect(washOf(variant)).not.toContain('group-data-[glass]/glass')
		}
	})

	it('leaves an inert row unwashed', () => {
		const { container } = renderUI(
			<List items={items.slice(0, 1)} getKey={(i) => i.id}>
				{(item) => <ListItem>{item.label}</ListItem>}
			</List>,
		)

		const item = bySlot(container, 'list-item')

		expect(item?.className ?? '').not.toContain('hover:bg-')

		expect(item).not.toHaveAttribute('data-interactive')
	})

	it('takes `interactive` over what the handlers say, in both directions', () => {
		// A row whose only handler sits on a child reads as inert to the derivation,
		// and a row that carries one for another reason reads as a target it is not.
		const { container } = renderUI(
			<List items={items.slice(0, 2)} variant="plain" getKey={(i) => i.id}>
				{(item, index) =>
					index === 0 ? (
						<ListItem interactive>{item.label}</ListItem>
					) : (
						<ListItem interactive={false} as="button" onClick={vi.fn()}>
							{item.label}
						</ListItem>
					)
				}
			</List>,
		)

		const [forced, suppressed] = [...container.querySelectorAll('[data-slot="list-item"]')]

		expect(forced).toHaveAttribute('data-interactive')

		expect(forced?.className ?? '').toContain('hover:bg-zinc-950/5')

		expect(suppressed).not.toHaveAttribute('data-interactive')

		expect(suppressed?.className ?? '').not.toContain('hover:bg-zinc-950/5')
	})

	it('adds corners on `rounded` and never takes a variant’s own away', () => {
		const { container } = renderUI(
			<List items={items.slice(0, 2)} variant="plain" getKey={(i) => i.id}>
				{(item, index) => <ListItem rounded={index === 0}>{item.label}</ListItem>}
			</List>,
		)

		const [on, off] = [...container.querySelectorAll('[data-slot="list-item"]')]

		expect(on?.className ?? '').toContain('rounded-lg')

		expect(off?.className ?? '').not.toContain('rounded-lg')

		const { container: separated } = renderUI(
			<List items={items.slice(0, 1)} variant="separated" getKey={(i) => i.id}>
				{(item) => <ListItem rounded={false}>{item.label}</ListItem>}
			</List>,
		)

		expect(bySlot(separated, 'list-item')?.className ?? '').toContain('rounded-lg')
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

	it('leaves keys from focusable descendants alone', () => {
		const onReorder = vi.fn()

		renderUI(
			<List items={items} getKey={(i) => i.id} sortable onReorder={onReorder}>
				{(item) => (
					<ListItem>
						{item.label}
						<input aria-label={`edit ${item.label}`} />
					</ListItem>
				)}
			</List>,
		)

		const input = screen.getByLabelText('edit Alpha')

		input.focus()

		// Space/Arrow/Home/End bubbling from an inner control are the control's
		// own keys; they must not be treated as lift/reorder gestures (which
		// would also preventDefault the caret movement away).
		const spaceEvent = fireEvent.keyDown(input, { key: ' ' })

		fireEvent.keyDown(input, { key: 'ArrowDown' })

		fireEvent.keyDown(input, { key: 'Home' })

		expect(onReorder).not.toHaveBeenCalled()

		expect(document.activeElement).toBe(input)

		// Not preventDefault'd: the key reaches the input.
		expect(spaceEvent).toBe(true)
	})

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

	// Live-region assertions are split per action: the dependent keydowns fire
	// synchronously (each fireEvent is act-flushed) so the lifted state can't be
	// lost to an `await` yielding mid-sequence; only the final message is awaited.
	const firstItem = (container: HTMLElement) => {
		const el = allBySlot(container, 'list-item')[0] as HTMLElement

		el.focus()

		return el
	}

	it('announces the item name and position on lift', async () => {
		const first = firstItem(renderList().container)

		fireEvent.keyDown(first, { key: ' ' })

		await expectAnnouncement('Picked up Alpha, position 1 of 3', 'assertive')
	})

	it('announces the new position on a move', async () => {
		const first = firstItem(renderList().container)

		fireEvent.keyDown(first, { key: ' ' })

		fireEvent.keyDown(first, { key: 'ArrowDown' })

		await expectAnnouncement('Alpha moved to position 2 of 3', 'assertive')
	})

	it('announces the drop', async () => {
		const first = firstItem(renderList().container)

		fireEvent.keyDown(first, { key: ' ' })

		fireEvent.keyDown(first, { key: 'Enter' })

		await expectAnnouncement('Dropped Alpha, position 1 of 3', 'assertive')
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
			<Density space="lg" size="sm">
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
