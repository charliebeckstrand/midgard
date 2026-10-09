import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { List, ListDescription, ListItem, ListLabel, type ListProps } from '../../components/list'
import { LIFT_INSTRUCTIONS } from '../../hooks/use-keyboard-lifted'
import { DensityProvider } from '../../providers/density'
import {
	allBySlot,
	bySlot,
	expectAnnouncement,
	fireEvent,
	getSlot,
	present,
	renderUI,
	screen,
} from '../helpers'

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

	it('keeps the three reorder arms of ListProps (compile-time)', () => {
		// The arms share one declaration of `getKey` and `onReorder`, so the API
		// prints each type one time. This pins the accepted set to the arms as
		// they were before that change.
		type Arms<P> = P extends unknown ? Pick<P, keyof ReorderArm & keyof P> : never

		type ReorderArm = {
			sortable?: boolean
			getKey?: (item: Item) => string
			onReorder?: (next: Item[]) => void
			virtual?: boolean
		}

		type Before =
			| {
					sortable?: true
					getKey: (item: Item) => string
					onReorder?: (next: Item[]) => void
					virtual?: false
			  }
			| {
					sortable: false
					getKey: (item: Item) => string
					onReorder: (next: Item[]) => void
					virtual?: false
			  }
			| {
					sortable: false
					getKey?: (item: Item) => string
					onReorder?: undefined
					virtual?: boolean
			  }

		expectTypeOf<Arms<ListProps<Item>>>().toEqualTypeOf<Before>()
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

	it('shows a handle on each row only when the list reorders', () => {
		const readOnly = renderUI(
			<List items={items} getKey={(i) => i.id}>
				{(item) => <ListItem>{item.label}</ListItem>}
			</List>,
		)

		expect(allBySlot(readOnly.container, 'list-handle')).toHaveLength(0)

		const reorderable = renderUI(
			<List items={items} getKey={(i) => i.id} onReorder={() => {}}>
				{(item) => <ListItem>{item.label}</ListItem>}
			</List>,
		)

		expect(allBySlot(reorderable.container, 'list-handle')).toHaveLength(items.length)
	})

	it('shows a disabled handle in a disabled list, and none in a disabled read-only list', () => {
		const disabled = renderUI(
			<List items={items} getKey={(i) => i.id} onReorder={() => {}} disabled>
				{(item) => <ListItem>{item.label}</ListItem>}
			</List>,
		)

		const handles = allBySlot(disabled.container, 'list-handle')

		expect(handles).toHaveLength(items.length)

		for (const handle of handles) expect(handle).toHaveAttribute('data-disabled')

		const readOnly = renderUI(
			<List items={items} getKey={(i) => i.id} disabled>
				{(item) => <ListItem>{item.label}</ListItem>}
			</List>,
		)

		expect(allBySlot(readOnly.container, 'list-handle')).toHaveLength(0)
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

		// `iro.on.wash.muted`, not the page-surface `muted` — see `iro/ramp.ts`.
		// `__tests__/recipes/contrast.test.ts` owns the ratio; this owns the step.
		expect(cls).toMatch(/(^|\s)text-zinc-600(\s|$)/)

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

		expect(cls).toMatch(/(^|\s)text-zinc-600(\s|$)/)

		expect(cls).toContain('hover:not-disabled:text-zinc-950')

		expect(cls).toContain('dark:hover:not-disabled:text-white')

		expect(cls).toContain('cursor-pointer')
	})

	it('renders a button content area for a row with onClick and no as', () => {
		const onClick = vi.fn()

		const { container } = renderUI(
			<List items={items.slice(0, 2)} getKey={(i) => i.id}>
				{(item) =>
					item === items[0] ? (
						<ListItem onClick={onClick}>{item.label}</ListItem>
					) : (
						<ListItem>{item.label}</ListItem>
					)
				}
			</List>,
		)

		const [clickable, inert] = Array.from(
			container.querySelectorAll<HTMLElement>('[data-slot="list-item-content"]'),
		)

		// A `<div>` with a click handler takes no focus and no Enter or Space.
		expect(clickable?.tagName).toBe('BUTTON')

		expect(clickable).toHaveAttribute('type', 'button')

		expect(inert?.tagName).toBe('DIV')

		fireEvent.click(present(clickable, 'clickable content'))

		expect(onClick).toHaveBeenCalledOnce()
	})

	it('reads a conditional handler by its value, not by the key it leaves behind', () => {
		// `onClick={enabled ? open : undefined}` keeps the key on an inert row, so a
		// key-presence test would promise a pointer the row never honors.
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
				'dark:group-data-glass/glass:not-disabled:not-data-disabled:hover:bg-white/10',
			)
		}
	})

	it('moves both washes of a rounded divided row onto its `::before` layer', () => {
		for (const variant of ['plain', 'outline'] as const) {
			const { container } = renderUI(
				<List items={items.slice(0, 1)} variant={variant} getKey={(i) => i.id}>
					{(item) => (
						<ListItem rounded as="button" onClick={vi.fn()}>
							{item.label}
						</ListItem>
					)}
				</List>,
			)

			const cls = bySlot(container, 'list-item')?.className ?? ''

			expect(cls).toContain('not-disabled:not-data-disabled:hover:before:bg-zinc-950/5')

			expect(cls).toContain(
				'dark:group-data-glass/glass:not-disabled:not-data-disabled:hover:before:bg-white/10',
			)

			expect(cls).not.toContain('hover:bg-')
		}
	})

	it('steps a card to the neighboring shade rather than washing its surface away', () => {
		const cls = washOf('separated')

		// An alpha wash replaces `omote.bg.surface` instead of darkening it, so the
		// card would go see-through to whatever it covers while the pointer rests on
		// it. The hover has to stay opaque.
		expect(cls).toContain('not-disabled:not-data-disabled:hover:bg-zinc-100')

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
		// `tint.glass` outranks a plain wash by selector, so a filled row that emitted
		// both would take the ambient 10% — which on a solid dark row is the fill
		// repainted, and on a card is the surface gone.
		for (const variant of ['separated', 'solid'] as const) {
			expect(washOf(variant)).not.toContain('group-data-glass/glass')
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

	it('stretches the row’s own handler over the whole painted row', () => {
		const { container } = renderUI(
			<List items={items.slice(0, 1)} getKey={(i) => i.id}>
				{(item) => (
					<ListItem as="button" onClick={vi.fn()} suffix={<button type="button">More</button>}>
						{item.label}
					</ListItem>
				)}
			</List>,
		)

		// The content column is only `flex-1`, so the padding, the gaps, and the
		// suffix chrome sat outside the target until the `::after` covered them.
		const content = bySlot(container, 'list-item-content')?.className ?? ''

		expect(content).toContain('after:absolute')

		expect(content).toContain('after:inset-0')

		const row = bySlot(container, 'list-item')?.className ?? ''

		// The row is the overlay's containing block, and the slots beside the content
		// column step over it — a trailing control has to stay pressable.
		expect(row).toContain('relative')

		expect(row).toContain('[&>*:not([data-slot=list-item-content])]:z-10')
	})

	it('stretches a linked row the same way', () => {
		const { container } = renderUI(
			<List items={items.slice(0, 1)} getKey={(i) => i.id}>
				{(item) => <ListItem href="/path">{item.label}</ListItem>}
			</List>,
		)

		expect(bySlot(container, 'list-item-content')?.className ?? '').toContain('after:absolute')
	})

	it('leaves an inert row’s padding inert', () => {
		const { container } = renderUI(
			<List items={items.slice(0, 1)} getKey={(i) => i.id}>
				{(item) => <ListItem>{item.label}</ListItem>}
			</List>,
		)

		expect(bySlot(container, 'list-item-content')?.className ?? '').not.toContain('after:absolute')

		expect(bySlot(container, 'list-item')?.className ?? '').not.toContain(
			'[&>*:not([data-slot=list-item-content])]:z-10',
		)
	})

	it('never stretches over the handler it cannot reach', () => {
		// `interactive` paints a row whose only handler sits on a child. The overlay
		// delivers a press to the content area alone, so stretching it there would
		// cover that child rather than serve it.
		const { container } = renderUI(
			<List items={items.slice(0, 2)} variant="plain" getKey={(i) => i.id}>
				{(item, index) =>
					index === 0 ? (
						<ListItem interactive>
							<button type="button">{item.label}</button>
						</ListItem>
					) : (
						<ListItem interactive={false} as="button" onClick={vi.fn()}>
							{item.label}
						</ListItem>
					)
				}
			</List>,
		)

		const contents = allBySlot(container, 'list-item-content')

		expect(contents).toHaveLength(2)

		// A row that suppresses the treatment gets no target it does not paint either.
		for (const content of contents) {
			expect(content.className).not.toContain('after:absolute')
		}
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

	it('gives a `bare` row no padding and no divider, and spaces the rows apart', () => {
		const { container } = renderUI(
			<List items={items.slice(0, 2)} variant="bare" getKey={(i) => i.id}>
				{(item) => <ListItem>{item.label}</ListItem>}
			</List>,
		)

		const root = bySlot(container, 'list')?.className ?? ''

		const row = bySlot(container, 'list-item')?.className ?? ''

		expect(root).toContain('density-gap-[0.5,1,2,3,4.5]')

		expect(root).not.toContain('divide-y')

		expect(row).not.toMatch(/(^|\s)(density-)?p[xy]?-/)
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

	it('describes the lift keys of the list, not the keys of dnd-kit', () => {
		const { container } = renderList()

		const row = getSlot(container, 'list-item')

		const instructions = document.getElementById(row.getAttribute('aria-describedby') ?? '')

		expect(instructions).toHaveTextContent(LIFT_INSTRUCTIONS.draggable)
	})

	it('gives an activatable row one Tab stop, on the content rather than the row', () => {
		const { container } = renderUI(
			<List items={items} getKey={(i) => i.id} sortable onReorder={() => {}}>
				{(item) => <ListItem href={`/${item.id}`}>{item.label}</ListItem>}
			</List>,
		)

		const row = bySlot(container, 'list-item')

		const content = bySlot(container, 'list-item-content')

		// A link is focusable already, so the reorder keys ride it. Wiring the `<li>` as well put
		// two stops on every row — one that moved it, one that opened it, and nothing to tell them
		// apart. The row keeps the drag node and the transform, and takes no focus.
		expect(content).toHaveAttribute('tabindex')
		expect(row).not.toHaveAttribute('tabindex')

		expect(container.querySelectorAll('[tabindex]')).toHaveLength(items.length)
	})

	it('keeps one Tab stop on a link row that suppresses the interactive treatment', () => {
		const { container } = renderUI(
			<List items={items} getKey={(i) => i.id} sortable onReorder={() => {}}>
				{(item) => (
					<ListItem href={`/${item.id}`} interactive={false}>
						{item.label}
					</ListItem>
				)}
			</List>,
		)

		// The prop sets only the treatment. The link stays focusable, so the stop stays on it.
		expect(bySlot(container, 'list-item-content')).toHaveAttribute('tabindex')
		expect(bySlot(container, 'list-item')).not.toHaveAttribute('tabindex')

		expect(container.querySelectorAll('[tabindex]')).toHaveLength(items.length)
	})

	it('keeps the stop on the row when its content only displays', () => {
		const { container } = renderUI(
			<List items={items} getKey={(i) => i.id} sortable onReorder={() => {}}>
				{(item) => <ListItem>{item.label}</ListItem>}
			</List>,
		)

		// Nothing focusable inside a display-only row, so the `<li>` has to be the stop — there is
		// still exactly one per row.
		expect(bySlot(container, 'list-item')).toHaveAttribute('tabindex')
		expect(bySlot(container, 'list-item-content')).not.toHaveAttribute('tabindex')
	})

	it('reorders an activatable row from its content stop', () => {
		const onReorder = vi.fn()

		const { container } = renderUI(
			<List items={items} getKey={(i) => i.id} sortable onReorder={onReorder}>
				{(item) => <ListItem href={`/${item.id}`}>{item.label}</ListItem>}
			</List>,
		)

		const content = allBySlot(container, 'list-item-content')[0] as HTMLElement

		content.focus()

		fireEvent.keyDown(content, { key: ' ' })
		fireEvent.keyDown(content, { key: 'ArrowDown' })

		expect(onReorder).toHaveBeenCalledWith([items[1], items[0], items[2]])
	})

	it('keeps reordering when a consumer passes its own onKeyDown, and still runs theirs', () => {
		const onReorder = vi.fn()
		const onKeyDown = vi.fn()

		const { container } = renderUI(
			<List items={items} getKey={(i) => i.id} sortable onReorder={onReorder}>
				{(item) => (
					<ListItem href={`/${item.id}`} onKeyDown={onKeyDown}>
						{item.label}
					</ListItem>
				)}
			</List>,
		)

		const content = allBySlot(container, 'list-item-content')[0] as HTMLElement

		content.focus()

		fireEvent.keyDown(content, { key: ' ' })
		fireEvent.keyDown(content, { key: 'ArrowDown' })

		// The row's stop and the consumer's props land on the same element, so a plain spread would
		// have let one silently win — and a consumer's `onKeyDown` quietly disabling reorder on that
		// row is a bug with nothing pointing at it.
		expect(onReorder).toHaveBeenCalledWith([items[1], items[0], items[2]])
		expect(onKeyDown).toHaveBeenCalledTimes(2)
	})

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

	it.each([
		['focuses the next item on ArrowDown when not lifted', 0, 'ArrowDown', 1],
		['focuses the previous item on ArrowUp when not lifted', 1, 'ArrowUp', 0],
		['jumps to the first item on Home', 2, 'Home', 0],
		['jumps to the last item on End', 0, 'End', 2],
	])('%s', (_name, from, key, to) => {
		const { container } = renderList()

		const listItems = allBySlot(container, 'list-item')

		listItems[from]?.focus()

		fireEvent.keyDown(listItems[from] as HTMLElement, { key })

		expect(document.activeElement).toBe(listItems[to])
	})

	it.each([
		[
			'moves a lifted item down with ArrowDown and calls onReorder',
			0,
			'ArrowDown',
			['b', 'a', 'c'],
		],
		['moves a lifted item up with ArrowUp and calls onReorder', 2, 'ArrowUp', ['a', 'c', 'b']],
	])('%s', (_name, from, key, expected) => {
		const onReorder = vi.fn()

		const { container } = renderList(onReorder)

		const item = allBySlot(container, 'list-item')[from] as HTMLElement

		item.focus()

		fireEvent.keyDown(item, { key: ' ' })

		fireEvent.keyDown(item, { key })

		expect(onReorder).toHaveBeenCalledOnce()

		expect(onReorder.mock.calls[0]?.[0].map((i: Item) => i.id)).toEqual(expected)
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

	it('gives duplicate primitive items distinct positional ids', () => {
		const { container } = renderUI(
			<List items={['draft', 'draft', 'sent']} sortable={false}>
				{(item) => <ListItem>{item}</ListItem>}
			</List>,
		)

		const ids = allBySlot(container, 'list-item').map((row) => row.getAttribute('data-item-id'))

		expect(ids).toEqual(['0', '1', '2'])
	})
})

describe('ListItem density', () => {
	// The row reads no context. Its padding is a stepped class, and the nearest
	// `data-density` scope selects the step in CSS. The card variants use the
	// uniform `ma.p` scale, and `plain` keeps a tighter px/py ratio.
	function firstItem(ui: Parameters<typeof renderUI>[0]) {
		const { container } = renderUI(ui)

		return present(bySlot(container, 'list-item'), 'list item')
	}

	const list = (variant?: 'plain') => (
		<List items={items} getKey={(i) => i.id} variant={variant}>
			{(item) => <ListItem>{item.label}</ListItem>}
		</List>
	)

	it('pads the card variant on the uniform scale', () => {
		expect(firstItem(list())).toHaveClass('density-p-[1,2,3,4,5]')
	})

	it('pads the plain variant on its tighter px/py ratio, with no uniform padding', () => {
		const item = firstItem(list('plain'))

		expect(item).toHaveClass('density-px-[1,1.5,2,2.5,3]', 'density-py-[0.5,1,1.5,2,2.5]')

		expect(item).not.toHaveClass('density-p-[1,2,3,4,5]')
	})

	it('follows the scope of a compact DensityProvider', () => {
		const item = firstItem(<DensityProvider density="compact">{list()}</DensityProvider>)

		expect(item.closest('[data-density]')).toHaveAttribute('data-density', 'sm')
	})
})
