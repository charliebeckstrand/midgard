import { use, useEffect, useMemo } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from '../../components/button'
import {
	CommandPalette,
	CommandPaletteClose,
	CommandPaletteDescription,
	CommandPaletteGroup,
	CommandPaletteHeading,
	CommandPaletteItem,
	CommandPaletteLabel,
	type CommandPaletteProps,
	CommandPaletteText,
	useCommandPaletteDeferredQuery,
	useCommandPaletteQuery,
} from '../../components/command-palette'
import type { VirtualItemSource } from '../../hooks/a11y/use-a11y-roving'
import { VirtualItemSourceContext } from '../../primitives/virtual-options/context'
import { NO_HOVER_QUERY } from '../../utilities/media-query'
import {
	act,
	bySlot,
	deferred,
	fireEvent,
	getSlot,
	renderUI,
	screen,
	setupUser,
	stubMatchMedia,
	waitFor,
} from '../helpers'

const FILTER_ITEMS = ['Alpha', 'Beta', 'Gamma']

type FilteredItemsProps = {
	/** The items before the filter. A rerender with new items changes the results under an unchanged query. */
	labels?: string[]
}

// Items that filter against the deferred query via the query context,
// mirroring real usage.
function FilteredItems({
	labels = FILTER_ITEMS,
	onAction,
}: FilteredItemsProps & {
	/** Runs with the label of the item that the palette runs. */
	onAction?: (label: string) => void
}) {
	const { deferredQuery } = useCommandPaletteQuery()

	return labels
		.filter((label) => label.toLowerCase().includes(deferredQuery.toLowerCase()))
		.map((label) => (
			<CommandPaletteItem key={label} onAction={onAction && (() => onAction(label))}>
				{label}
			</CommandPaletteItem>
		))
}

function FilteredPalette({
	labels,
	onActiveChange,
}: FilteredItemsProps & Pick<CommandPaletteProps, 'onActiveChange'>) {
	return (
		<CommandPalette open onOpenChange={() => {}} onActiveChange={onActiveChange}>
			<FilteredItems labels={labels} />
		</CommandPalette>
	)
}

describe('CommandPalette', () => {
	it('renders the input, command list, and close button when open', () => {
		renderUI(
			<CommandPalette open onOpenChange={() => {}}>
				<div>Items</div>
			</CommandPalette>,
		)

		expect(bySlot(document.body, 'command-palette-input')).toBeInTheDocument()

		const list = bySlot(document.body, 'command-palette-list')

		expect(list).toBeInTheDocument()

		expect(list).toHaveAttribute('role', 'listbox')

		const footer = bySlot(document.body, 'command-palette-footer')

		expect(footer).toContainElement(screen.getByRole('button', { name: 'Close' }))
	})

	it('does not render when closed', () => {
		renderUI(
			<CommandPalette open={false} onOpenChange={() => {}}>
				<div>Items</div>
			</CommandPalette>,
		)

		expect(bySlot(document.body, 'command-palette-input')).not.toBeInTheDocument()
	})

	it('closes the palette from the default footer Close button', async () => {
		const onOpenChange = vi.fn()

		renderUI(
			<CommandPalette open onOpenChange={onOpenChange}>
				<div>Items</div>
			</CommandPalette>,
		)

		await setupUser().click(screen.getByRole('button', { name: 'Close' }))

		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	it('replaces the default Close button with the footer content', () => {
		renderUI(
			<CommandPalette open onOpenChange={() => {}} footer={<Button type="button">Create</Button>}>
				<div>Items</div>
			</CommandPalette>,
		)

		const footer = bySlot(document.body, 'command-palette-footer')

		expect(footer).toContainElement(screen.getByRole('button', { name: 'Create' }))

		expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
	})

	it('removes the footer row when footer is null', () => {
		renderUI(
			<CommandPalette open onOpenChange={() => {}} footer={null}>
				<div>Items</div>
			</CommandPalette>,
		)

		expect(bySlot(document.body, 'command-palette-input')).toBeInTheDocument()

		expect(bySlot(document.body, 'command-palette-footer')).not.toBeInTheDocument()
	})

	it('keeps CommandPaletteClose beside custom footer actions', async () => {
		const onOpenChange = vi.fn()

		const onClick = vi.fn((event: { preventDefault: () => void }) => event.preventDefault())

		renderUI(
			<CommandPalette
				open
				onOpenChange={onOpenChange}
				footer={
					<>
						<Button type="button">Create</Button>
						<CommandPaletteClose onClick={onClick}>Done</CommandPaletteClose>
					</>
				}
			>
				<div>Items</div>
			</CommandPalette>,
		)

		const done = screen.getByRole('button', { name: 'Done' })

		expect(done).toHaveAttribute('type', 'button')

		await setupUser().click(done)

		// The caller handler runs first, and its `preventDefault()` does not stop the close.
		expect(onClick).toHaveBeenCalled()

		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	it('applies placeholder to input', () => {
		renderUI(
			<CommandPalette open onOpenChange={() => {}} placeholder="Search commands">
				<div>Items</div>
			</CommandPalette>,
		)

		const input = bySlot(document.body, 'command-palette-input')

		expect(input).toHaveAttribute('placeholder', 'Search commands')
	})
})

describe('CommandPalette active descendant', () => {
	it('points the input at the active item and marks it aria-selected on arrow', async () => {
		renderUI(
			<CommandPalette open onOpenChange={() => {}}>
				<CommandPaletteItem>Alpha</CommandPaletteItem>
				<CommandPaletteItem>Beta</CommandPaletteItem>
			</CommandPalette>,
		)

		const input = screen.getByRole('combobox') as HTMLInputElement

		const user = setupUser()

		await user.keyboard('{ArrowDown}')

		const options = screen.getAllByRole('option')

		expect(options[0]).toHaveAttribute('aria-selected', 'true')

		expect(options[0]?.id).toBeTruthy()

		expect(input).toHaveAttribute('aria-activedescendant', options[0]?.id)
	})

	it('reserves End for the input caret instead of jumping the highlight to the last option', async () => {
		renderUI(
			<CommandPalette open onOpenChange={() => {}}>
				<CommandPaletteItem>Alpha</CommandPaletteItem>
				<CommandPaletteItem>Beta</CommandPaletteItem>
			</CommandPalette>,
		)

		const input = screen.getByRole('combobox') as HTMLInputElement

		const user = setupUser()

		await user.keyboard('{ArrowDown}')

		const options = screen.getAllByRole('option')

		expect(input).toHaveAttribute('aria-activedescendant', options[0]?.id)

		await user.keyboard('{End}')

		// End belongs to the textbox caret; routed to roving it would move the
		// highlight to the last option (Beta). The guard keeps it on Alpha.
		expect(input).toHaveAttribute('aria-activedescendant', options[0]?.id)
	})

	it('moves the active item to the top result when the filter changes', async () => {
		renderUI(<FilteredPalette />)

		const user = setupUser()

		// Activate the first option (Alpha), then filter it out.
		await user.keyboard('{ArrowDown}')

		await user.type(screen.getByRole('combobox'), 'gam')

		const options = screen.getAllByRole('option')

		expect(options).toHaveLength(1)

		expect(options[0]).toHaveTextContent('Gamma')

		expect(options[0]).toHaveAttribute('aria-selected', 'true')

		expect(screen.getByRole('combobox')).toHaveAttribute('aria-activedescendant', options[0]?.id)
	})

	it('clears the active item when the filter matches nothing', async () => {
		renderUI(<FilteredPalette />)

		const user = setupUser()

		await user.keyboard('{ArrowDown}')

		expect(screen.getByRole('combobox')).toHaveAttribute('aria-activedescendant')

		await user.type(screen.getByRole('combobox'), 'zzz')

		expect(screen.queryAllByRole('option')).toHaveLength(0)

		expect(screen.getByRole('combobox')).not.toHaveAttribute('aria-activedescendant')
	})

	// A phone has no hover. The reader taps a row there, so a highlight on the top
	// result looks like a row that they picked.
	it('clears the active item when the filter changes on a device with no hover', async () => {
		stubMatchMedia((query) => query === NO_HOVER_QUERY)

		const onActiveChange = vi.fn()

		renderUI(<FilteredPalette onActiveChange={onActiveChange} />)

		const user = setupUser()

		const input = screen.getByRole('combobox')

		await user.keyboard('{ArrowDown}')

		expect(input).toHaveAttribute('aria-activedescendant')

		await user.type(input, 'a')

		const options = screen.getAllByRole('option')

		expect(options).toHaveLength(3)

		expect(input).not.toHaveAttribute('aria-activedescendant')

		for (const option of options) {
			expect(option).not.toHaveAttribute('data-active')

			expect(option).not.toHaveAttribute('aria-selected', 'true')
		}

		expect(onActiveChange).toHaveBeenLastCalledWith(null)

		// An arrow key still sets the highlight, on the first option.
		await user.keyboard('{ArrowDown}')

		expect(input).toHaveAttribute('aria-activedescendant', options[0]?.id)
	})
})

// Stands in for a `VirtualOptions` with `getOptionId`. It registers a source as
// the primitive does, and it renders each row. A real virtualizer is barred
// here (CONVENTIONS §10.3).
function SourceStandIn({ ids, scrollToIndex }: { ids: string[]; scrollToIndex?: () => void }) {
	const registry = use(VirtualItemSourceContext)

	const source = useMemo<VirtualItemSource>(
		() => ({
			count: ids.length,
			getKey: (index) => ids[index] ?? '',
			scrollToIndex: scrollToIndex ?? (() => {}),
		}),
		[ids, scrollToIndex],
	)

	useEffect(() => {
		if (!registry) return

		registry.current = source

		return () => {
			registry.current = null
		}
	}, [registry, source])

	return ids.map((id) => (
		<CommandPaletteItem key={id} id={id}>
			{id}
		</CommandPaletteItem>
	))
}

describe('CommandPalette results that change under an unchanged query', () => {
	// The places palette: a filter runs before the countries load, so it seeds
	// nothing. Then the countries arrive with no change to the query.
	it('seeds the top result when results arrive after a filter that matched nothing', async () => {
		const onActiveChange = vi.fn()

		const { rerender } = renderUI(<FilteredPalette labels={[]} onActiveChange={onActiveChange} />)

		const input = screen.getByRole('combobox')

		await setupUser().type(input, 'fr')

		expect(input).not.toHaveAttribute('aria-activedescendant')

		rerender(<FilteredPalette labels={['France', 'Freetown']} onActiveChange={onActiveChange} />)

		const [top] = screen.getAllByRole('option')

		await waitFor(() => expect(input).toHaveAttribute('aria-activedescendant', top?.id))

		expect(top).toHaveAttribute('data-active')

		expect(onActiveChange).toHaveBeenLastCalledWith(top?.id)
	})

	it('moves a seeded highlight to a new top result', async () => {
		const { rerender } = renderUI(<FilteredPalette labels={['Beta']} />)

		const input = screen.getByRole('combobox')

		await setupUser().type(input, 'a')

		expect(input).toHaveAttribute('aria-activedescendant', screen.getByRole('option').id)

		rerender(<FilteredPalette labels={['Alpha', 'Beta']} />)

		const [alpha, beta] = screen.getAllByRole('option')

		await waitFor(() => expect(input).toHaveAttribute('aria-activedescendant', alpha?.id))

		expect(alpha).toHaveAttribute('data-active')

		expect(beta).not.toHaveAttribute('data-active')
	})

	// On open the highlight is empty by design, and the first arrow key picks
	// the first result.
	it('keeps the highlight empty when results arrive before a filter', async () => {
		const { rerender } = renderUI(<FilteredPalette labels={[]} />)

		const input = screen.getByRole('combobox')

		await waitFor(() => expect(input).toHaveAttribute('aria-expanded', 'false'))

		rerender(<FilteredPalette labels={['Alpha']} />)

		// The emptiness probe reads the same mutation, so this waits for the
		// observer of the listbox.
		await waitFor(() => expect(input).toHaveAttribute('aria-expanded', 'true'))

		expect(input).not.toHaveAttribute('aria-activedescendant')

		expect(screen.getByRole('option')).not.toHaveAttribute('data-active')
	})

	it('keeps a highlight that an arrow key moved', async () => {
		const { rerender } = renderUI(<FilteredPalette labels={['Beta', 'Gamma']} />)

		const input = screen.getByRole('combobox')

		const user = setupUser()

		await user.type(input, 'a')

		await user.keyboard('{ArrowDown}')

		const gamma = screen.getByRole('option', { name: 'Gamma' })

		expect(input).toHaveAttribute('aria-activedescendant', gamma.id)

		rerender(<FilteredPalette labels={['Alpha', 'Beta', 'Gamma']} />)

		// Lets the observer of the listbox report the mutation.
		await act(async () => {})

		expect(input).toHaveAttribute('aria-activedescendant', gamma.id)

		expect(screen.getByRole('option', { name: 'Alpha' })).not.toHaveAttribute('data-active')
	})

	// A moved highlight belongs to the reader only while its row exists. When the
	// row goes, the top result takes the highlight, as in Combobox.
	it('seeds the top result when the row of a moved highlight goes', async () => {
		const { rerender } = renderUI(<FilteredPalette labels={['Beta', 'Gamma']} />)

		const input = screen.getByRole('combobox')

		const user = setupUser()

		await user.type(input, 'a')

		await user.keyboard('{ArrowDown}')

		expect(input).toHaveAttribute(
			'aria-activedescendant',
			screen.getByRole('option', { name: 'Gamma' }).id,
		)

		rerender(<FilteredPalette labels={['Beta']} />)

		const beta = screen.getByRole('option', { name: 'Beta' })

		await waitFor(() => expect(input).toHaveAttribute('aria-activedescendant', beta.id))

		expect(beta).toHaveAttribute('data-active')
	})

	it('seeds the top result when a registered source drops the row of a moved highlight', async () => {
		const palette = (ids: string[]) => (
			<CommandPalette open onOpenChange={() => {}}>
				<SourceStandIn ids={ids} />
			</CommandPalette>
		)

		const { rerender } = renderUI(palette(['a-0', 'a-1', 'a-2']))

		const input = screen.getByRole('combobox')

		const user = setupUser()

		await user.type(input, 'x')

		await user.keyboard('{ArrowDown}{ArrowDown}')

		expect(input).toHaveAttribute('aria-activedescendant', 'a-2')

		rerender(palette(['a-0']))

		await waitFor(() => expect(input).toHaveAttribute('aria-activedescendant', 'a-0'))

		expect(document.getElementById('a-0')).toHaveAttribute('data-active')
	})

	it('seeds the top result again when a registered source changes', async () => {
		const palette = (ids: string[]) => (
			<CommandPalette open onOpenChange={() => {}}>
				<SourceStandIn ids={ids} />
			</CommandPalette>
		)

		const { rerender } = renderUI(palette(['old-0', 'old-1']))

		const input = screen.getByRole('combobox')

		// The stand-in does not filter, so any query seeds its top row.
		await setupUser().type(input, 'x')

		expect(input).toHaveAttribute('aria-activedescendant', 'old-0')

		rerender(palette(['new-0', 'new-1']))

		await waitFor(() => expect(input).toHaveAttribute('aria-activedescendant', 'new-0'))

		expect(document.getElementById('new-0')).toHaveAttribute('data-active')
	})

	// A change that keeps the top result keeps the highlight, so the list does
	// not scroll back to it.
	it('leaves a seeded highlight that a source change keeps on the top result', async () => {
		const scrollToIndex = vi.fn()

		const palette = (ids: string[]) => (
			<CommandPalette open onOpenChange={() => {}}>
				<SourceStandIn ids={ids} scrollToIndex={scrollToIndex} />
			</CommandPalette>
		)

		const { rerender } = renderUI(palette(['top', 'next']))

		const input = screen.getByRole('combobox')

		await setupUser().type(input, 'x')

		expect(input).toHaveAttribute('aria-activedescendant', 'top')

		scrollToIndex.mockClear()

		rerender(palette(['top', 'next', 'last']))

		await act(async () => {})

		expect(input).toHaveAttribute('aria-activedescendant', 'top')

		expect(scrollToIndex).not.toHaveBeenCalled()
	})
})

// Suspends the render that brings the deferred query to `query` until `gate`
// settles. Thus the deferred query lags the input, as it does while a long list
// renders.
function DeferredQueryGate({ query, gate }: { query: string; gate: Promise<void> }) {
	if (useCommandPaletteDeferredQuery() === query) use(gate)

	return null
}

describe('CommandPalette Enter while the deferred query lags', () => {
	it('runs the top result of the typed query once the results render', async () => {
		const gate = deferred()

		const onAction = vi.fn()

		renderUI(
			<CommandPalette open onOpenChange={() => {}}>
				<DeferredQueryGate query="b" gate={gate.promise} />
				<FilteredItems onAction={onAction} />
			</CommandPalette>,
		)

		const input = screen.getByRole('combobox')

		// The highlight sits on Alpha, which the query "b" filters out.
		await setupUser().keyboard('{ArrowDown}')

		await act(async () => {
			fireEvent.change(input, { target: { value: 'b' } })
		})

		expect(input).toHaveValue('b')

		expect(screen.getAllByRole('option')).toHaveLength(3)

		fireEvent.keyDown(input, { key: 'Enter' })

		expect(onAction).not.toHaveBeenCalled()

		await act(async () => gate.resolve())

		expect(onAction.mock.calls).toEqual([['Beta']])
	})
})

// A router link reads the modifier keys of a click. With Ctrl or Cmd held, it
// lets the browser open the link in a new tab.
const NO_MODIFIERS = { altKey: false, ctrlKey: false, metaKey: false, shiftKey: false }

type LinkClick = typeof NO_MODIFIERS & { preventDefault: () => void }

// Records the click on a link item. It cancels the default, because jsdom does
// not navigate.
function recordLinkClick() {
	return vi.fn((event: LinkClick) => event.preventDefault())
}

// Link items that filter against the deferred query, as `FilteredItems` does.
function FilteredLinks({ onClick }: { onClick: (event: LinkClick) => void }) {
	const { deferredQuery } = useCommandPaletteQuery()

	return FILTER_ITEMS.filter((label) =>
		label.toLowerCase().includes(deferredQuery.toLowerCase()),
	).map((label) => (
		<CommandPaletteItem key={label} href={`/${label.toLowerCase()}`} onClick={onClick}>
			{label}
		</CommandPaletteItem>
	))
}

describe('CommandPalette Enter on a link item', () => {
	it.each(['altKey', 'ctrlKey', 'metaKey', 'shiftKey'] as const)(
		'gives the %s of the Enter to the click on the link',
		async (modifier) => {
			const onClick = recordLinkClick()

			renderUI(
				<CommandPalette open onOpenChange={() => {}}>
					<CommandPaletteItem href="/somewhere" onClick={onClick}>
						Go
					</CommandPaletteItem>
				</CommandPalette>,
			)

			await setupUser().keyboard('{ArrowDown}')

			fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter', [modifier]: true })

			expect(onClick).toHaveBeenCalledTimes(1)

			expect(onClick).toHaveBeenCalledWith(
				expect.objectContaining({ ...NO_MODIFIERS, [modifier]: true }),
			)
		},
	)

	it('gives the modifiers of an Enter that waits for the results to the click', async () => {
		const gate = deferred()

		const onClick = recordLinkClick()

		renderUI(
			<CommandPalette open onOpenChange={() => {}}>
				<DeferredQueryGate query="b" gate={gate.promise} />
				<FilteredLinks onClick={onClick} />
			</CommandPalette>,
		)

		const input = screen.getByRole('combobox')

		await setupUser().keyboard('{ArrowDown}')

		await act(async () => {
			fireEvent.change(input, { target: { value: 'b' } })
		})

		// The palette holds the Enter, and runs it after the results render. The
		// held event then has no current target, so the click reads the keys
		// from the fields of the event.
		fireEvent.keyDown(input, { key: 'Enter', metaKey: true })

		expect(onClick).not.toHaveBeenCalled()

		await act(async () => gate.resolve())

		expect(onClick).toHaveBeenCalledTimes(1)

		expect(onClick).toHaveBeenCalledWith(
			expect.objectContaining({ ...NO_MODIFIERS, metaKey: true, target: screen.getByText('Beta') }),
		)
	})
})

// Stands in for the wrapper that `VirtualOptions` renders. A real virtualizer
// is barred here (CONVENTIONS §10.3). The wrapper stamps `data-empty` from its
// items, and its window can hold no row while items remain.
function VirtualWrapperStandIn({ empty }: { empty: boolean }) {
	return <div role="presentation" data-slot="virtual-options" data-empty={empty ? '' : undefined} />
}

describe('CommandPalette no results', () => {
	// A live region speaks only a change of text, and only while it is in the
	// accessibility tree. The palette measures the options after the commit (a
	// MutationObserver), so the assertions poll.
	it('writes the no-results text into a status region that stays exposed', async () => {
		renderUI(<FilteredPalette />)

		const status = getSlot(document.body, 'command-palette-no-results')

		// `<output>` is role="status", a polite live region. It sits outside the
		// listbox, which owns only options (aria-required-children).
		expect(status.tagName).toBe('OUTPUT')

		expect(bySlot(document.body, 'command-palette-list')).not.toContainElement(status)

		// jsdom loads no stylesheet, so the class list stands in for the display.
		expect(status).not.toHaveClass('hidden')

		expect(status.textContent).toBe('')

		const user = setupUser()

		await user.type(screen.getByRole('combobox'), 'zzz')

		await waitFor(() => expect(status).toHaveTextContent('No results'))

		// The same node, so the region was in the tree before its text changed.
		expect(bySlot(document.body, 'command-palette-no-results')).toBe(status)

		expect(status).not.toHaveClass('hidden')

		await user.clear(screen.getByRole('combobox'))

		await waitFor(() => expect(status.textContent).toBe(''))
	})

	it('reports the combobox collapsed while the filter matches nothing', async () => {
		renderUI(<FilteredPalette />)

		const input = screen.getByRole('combobox')

		expect(input).toHaveAttribute('aria-expanded', 'true')

		const user = setupUser()

		await user.type(input, 'zzz')

		await waitFor(() => expect(input).toHaveAttribute('aria-expanded', 'false'))

		await user.clear(input)

		await waitFor(() => expect(input).toHaveAttribute('aria-expanded', 'true'))
	})

	// A close detaches the listbox and resets the query. The next open must show
	// the results of the reset query at its first commit, not the stale empty state.
	it('shows no stale no-results text when it opens again after an empty filter', async () => {
		const palette = (open: boolean) => (
			<CommandPalette open={open} onOpenChange={() => {}}>
				<FilteredItems />
			</CommandPalette>
		)

		const { rerender } = renderUI(palette(true))

		await setupUser().type(screen.getByRole('combobox'), 'zzz')

		await waitFor(() =>
			expect(getSlot(document.body, 'command-palette-no-results')).toHaveTextContent('No results'),
		)

		rerender(palette(false))

		await waitFor(() => expect(screen.queryByRole('combobox')).not.toBeInTheDocument())

		rerender(palette(true))

		// No wait: the layout effect measures the listbox before the paint.
		expect(getSlot(document.body, 'command-palette-no-results').textContent).toBe('')

		expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'true')
	})

	it('reads emptiness from a virtual list, not from its rendered rows', async () => {
		const { rerender } = renderUI(
			<CommandPalette open onOpenChange={() => {}}>
				<VirtualWrapperStandIn empty={false} />
			</CommandPalette>,
		)

		const input = screen.getByRole('combobox')

		const status = getSlot(document.body, 'command-palette-no-results')

		// No row is rendered, but the list holds items outside its window.
		expect(screen.queryAllByRole('option')).toHaveLength(0)

		expect(input).toHaveAttribute('aria-expanded', 'true')

		expect(status.textContent).toBe('')

		rerender(
			<CommandPalette open onOpenChange={() => {}}>
				<VirtualWrapperStandIn empty />
			</CommandPalette>,
		)

		await waitFor(() => expect(input).toHaveAttribute('aria-expanded', 'false'))

		expect(status).toHaveTextContent('No results')
	})
})

describe('CommandPaletteGroup', () => {
	it('names the group from a nested heading', () => {
		const { container } = renderUI(
			<CommandPaletteGroup>
				<CommandPaletteHeading>Actions</CommandPaletteHeading>
				<div>child</div>
			</CommandPaletteGroup>,
		)

		const title = bySlot(container, 'command-palette-heading')

		expect(title).toHaveTextContent('Actions')

		const group = bySlot(container, 'command-palette-group')

		expect(group).toHaveAttribute('role', 'group')

		expect(group).toHaveAttribute('aria-labelledby', title?.id)
	})

	it('leaves the group unnamed when no heading is nested', () => {
		const { container } = renderUI(
			<CommandPaletteGroup>
				<div>child</div>
			</CommandPaletteGroup>,
		)

		expect(bySlot(container, 'command-palette-heading')).not.toBeInTheDocument()

		expect(bySlot(container, 'command-palette-group')).not.toHaveAttribute('aria-labelledby')
	})

	it('keeps role="group" when a consumer passes another role', () => {
		const { container } = renderUI(
			<CommandPaletteGroup role="presentation">
				<div>child</div>
			</CommandPaletteGroup>,
		)

		expect(bySlot(container, 'command-palette-group')).toHaveAttribute('role', 'group')
	})

	it('applies a custom className to the group', () => {
		const { container } = renderUI(
			<CommandPaletteGroup className="custom">
				<div>child</div>
			</CommandPaletteGroup>,
		)

		expect(bySlot(container, 'command-palette-group')?.className).toContain('custom')
	})
})

describe('CommandPaletteItem', () => {
	it('renders as a button by default', () => {
		renderUI(
			<CommandPalette open onOpenChange={() => {}}>
				<CommandPaletteItem>Item</CommandPaletteItem>
			</CommandPalette>,
		)

		const item = bySlot(document.body, 'command-palette-item')

		expect(item?.tagName).toBe('BUTTON')

		expect(item).toHaveAttribute('role', 'option')
	})

	it('keeps type="button" when a consumer passes another type', () => {
		renderUI(
			<CommandPalette open onOpenChange={() => {}}>
				<CommandPaletteItem type="submit">Item</CommandPaletteItem>
			</CommandPalette>,
		)

		// A submit type would make a press on the row submit an enclosing form.
		expect(bySlot(document.body, 'command-palette-item')).toHaveAttribute('type', 'button')
	})

	it('calls onAction and closes the palette on click', async () => {
		const onOpenChange = vi.fn()

		const onAction = vi.fn()

		renderUI(
			<CommandPalette open onOpenChange={onOpenChange}>
				<CommandPaletteItem onAction={onAction}>Run</CommandPaletteItem>
			</CommandPalette>,
		)

		const user = setupUser()

		await user.click(screen.getByText('Run'))

		expect(onAction).toHaveBeenCalled()

		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	it('leaves the Enter that confirms an IME composition to the IME', async () => {
		const onAction = vi.fn()

		renderUI(
			<CommandPalette open onOpenChange={() => {}}>
				<CommandPaletteItem onAction={onAction}>Run</CommandPaletteItem>
			</CommandPalette>,
		)

		const input = screen.getByRole('combobox')

		await setupUser().keyboard('{ArrowDown}')

		fireEvent.keyDown(input, { key: 'Enter', isComposing: true })

		fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 })

		expect(onAction).not.toHaveBeenCalled()

		fireEvent.keyDown(input, { key: 'Enter' })

		expect(onAction).toHaveBeenCalledTimes(1)
	})

	it('composes a consumer onClick with the selection handler', async () => {
		const onClick = vi.fn()

		const onAction = vi.fn()

		renderUI(
			<CommandPalette open onOpenChange={() => {}}>
				<CommandPaletteItem onAction={onAction} onClick={onClick}>
					Run
				</CommandPaletteItem>
			</CommandPalette>,
		)

		const user = setupUser()

		await user.click(screen.getByText('Run'))

		// A consumer handler must not clobber selection/close; both fire.
		expect(onClick).toHaveBeenCalled()

		expect(onAction).toHaveBeenCalled()
	})

	it('does not close the palette when closeOnAction is false', async () => {
		const onOpenChange = vi.fn()

		const onAction = vi.fn()

		renderUI(
			<CommandPalette open onOpenChange={onOpenChange}>
				<CommandPaletteItem onAction={onAction} closeOnAction={false}>
					Run
				</CommandPaletteItem>
			</CommandPalette>,
		)

		const user = setupUser()

		await user.click(screen.getByText('Run'))

		expect(onAction).toHaveBeenCalled()

		expect(onOpenChange).not.toHaveBeenCalledWith(false)
	})

	it('marks a disabled item aria-disabled and invokes neither onAction nor onClick', async () => {
		const onAction = vi.fn()

		const onClick = vi.fn()

		renderUI(
			<CommandPalette open onOpenChange={() => {}}>
				<CommandPaletteItem disabled onAction={onAction} onClick={onClick}>
					Run
				</CommandPaletteItem>
			</CommandPalette>,
		)

		expect(screen.getByRole('option')).toHaveAttribute('aria-disabled', 'true')

		const user = setupUser()

		await user.click(screen.getByText('Run'))

		expect(onAction).not.toHaveBeenCalled()

		expect(onClick).not.toHaveBeenCalled()
	})

	it('gives a link item that opens a new tab noopener noreferrer', () => {
		renderUI(
			<CommandPalette open onOpenChange={() => {}}>
				<CommandPaletteItem href="/somewhere" target="_blank">
					Go
				</CommandPaletteItem>
			</CommandPalette>,
		)

		expect(screen.getByText('Go').closest('a')).toHaveAttribute('rel', 'noopener noreferrer')
	})

	it('keeps the caller attributes on a disabled link item, but not the link ones', () => {
		renderUI(
			<CommandPalette open onOpenChange={() => {}}>
				<CommandPaletteItem disabled href="/somewhere" target="_blank" title="Go there">
					Go
				</CommandPaletteItem>
			</CommandPalette>,
		)

		const item = screen.getByText('Go')

		expect(item).toHaveAttribute('title', 'Go there')

		expect(item).not.toHaveAttribute('target')

		expect(item).not.toHaveAttribute('href')
	})

	it('renders a disabled link item with no href', () => {
		renderUI(
			<CommandPalette open onOpenChange={() => {}}>
				<CommandPaletteItem disabled href="/somewhere">
					Go
				</CommandPaletteItem>
			</CommandPalette>,
		)

		// Middle-click and "Open in new tab" fire no click. Only a row with no
		// href stops them.
		const item = screen.getByText('Go')

		expect(item.tagName).toBe('SPAN')

		expect(item).not.toHaveAttribute('href')

		expect(item).toHaveAttribute('role', 'option')

		expect(item).toHaveAttribute('aria-disabled', 'true')

		expect(item).toHaveAttribute('data-slot', 'command-palette-item')
	})

	it.each([
		['a button item', () => <CommandPaletteItem>Run</CommandPaletteItem>],
		['a link item', () => <CommandPaletteItem href="/somewhere">Run</CommandPaletteItem>],
		[
			'a disabled link item',
			() => (
				<CommandPaletteItem disabled href="/somewhere">
					Run
				</CommandPaletteItem>
			),
		],
	])('keeps focus on the input when %s is pressed', async (_, renderItem) => {
		renderUI(
			<CommandPalette open onOpenChange={() => {}}>
				{renderItem()}
			</CommandPalette>,
		)

		const input = screen.getByRole('combobox')

		const item = screen.getByRole('option')

		// The input holds the query and the arrow keys, so a press must not
		// move focus to the row.
		expect(fireEvent.mouseDown(item)).toBe(false)

		await setupUser().pointer({ keys: '[MouseLeft>]', target: item })

		expect(document.activeElement).toBe(input)
	})

	// The chrome of the list holds no option, so a press there must not take the
	// focus from the input either.
	it.each([
		['a group heading', () => screen.getByText('Recent')],
		['the gap between the rows', () => screen.getByRole('group')],
		['the no-results status', () => getSlot(document.body, 'command-palette-no-results')],
	])('keeps focus on the input when %s is pressed', async (_, target) => {
		renderUI(
			<CommandPalette open onOpenChange={() => {}}>
				<CommandPaletteGroup>
					<CommandPaletteHeading>Recent</CommandPaletteHeading>
					<CommandPaletteItem>Run</CommandPaletteItem>
				</CommandPaletteGroup>
			</CommandPalette>,
		)

		const input = screen.getByRole('combobox')

		expect(fireEvent.mouseDown(target())).toBe(false)

		await setupUser().pointer({ keys: '[MouseLeft>]', target: target() })

		expect(document.activeElement).toBe(input)
	})

	it('runs a consumer onMouseDown before it keeps focus on the input', async () => {
		// The handler gives the state of the default when it runs.
		const onMouseDown = vi.fn((event: { defaultPrevented: boolean }) => event.defaultPrevented)

		renderUI(
			<CommandPalette open onOpenChange={() => {}}>
				<CommandPaletteItem onMouseDown={onMouseDown}>Run</CommandPaletteItem>
			</CommandPalette>,
		)

		const item = screen.getByRole('option')

		expect(fireEvent.mouseDown(item)).toBe(false)

		expect(onMouseDown).toHaveBeenCalledTimes(1)

		expect(onMouseDown).toHaveReturnedWith(false)
	})
})

describe('CommandPaletteLabel, CommandPaletteText, and CommandPaletteDescription', () => {
	it('renders the label with data-slot="command-palette-label"', () => {
		const { container } = renderUI(<CommandPaletteLabel>Label</CommandPaletteLabel>)

		expect(bySlot(container, 'command-palette-label')).toHaveTextContent('Label')
	})

	it('renders the description with data-slot="command-palette-description"', () => {
		const { container } = renderUI(<CommandPaletteDescription>About</CommandPaletteDescription>)

		expect(bySlot(container, 'command-palette-description')).toHaveTextContent('About')
	})

	it('renders the text with data-slot="command-palette-text", which stacks the label over the description', () => {
		const { container } = renderUI(
			<CommandPaletteText>
				<CommandPaletteLabel>Label</CommandPaletteLabel>

				<CommandPaletteDescription>About</CommandPaletteDescription>
			</CommandPaletteText>,
		)

		const text = bySlot(container, 'command-palette-text')

		expect(text).toContainElement(bySlot(container, 'command-palette-label'))

		expect(text).toContainElement(bySlot(container, 'command-palette-description'))

		expect(text).toHaveClass('flex-col')
	})
})

describe('CommandPalette triggerShortcut', () => {
	// tinykeys resolves `$mod` to ctrlKey on non-Mac platforms; jsdom is non-Mac.
	// A browser keydown is cancelable, so a handler can mark it as taken.
	const MOD_K = { key: 'k', code: 'KeyK', ctrlKey: true, bubbles: true, cancelable: true }

	function pressModK(init: KeyboardEventInit = {}) {
		window.dispatchEvent(new KeyboardEvent('keydown', { ...MOD_K, ...init }))
	}

	it('opens the palette when the default $mod+KeyK fires while closed', () => {
		const onOpenChange = vi.fn()

		renderUI(
			<CommandPalette open={false} onOpenChange={onOpenChange}>
				<div>Items</div>
			</CommandPalette>,
		)

		pressModK()

		expect(onOpenChange).toHaveBeenCalledWith(true)
	})

	it('closes the palette when the shortcut fires while open', () => {
		const onOpenChange = vi.fn()

		renderUI(
			<CommandPalette open onOpenChange={onOpenChange}>
				<div>Items</div>
			</CommandPalette>,
		)

		pressModK()

		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	it('ignores the OS auto-repeat of a held shortcut', () => {
		const onOpenChange = vi.fn()

		renderUI(
			<CommandPalette open={false} onOpenChange={onOpenChange}>
				<div>Items</div>
			</CommandPalette>,
		)

		pressModK({ repeat: true })

		expect(onOpenChange).not.toHaveBeenCalled()
	})

	it('leaves the shortcut to the IME while a composition is active', () => {
		const onOpenChange = vi.fn()

		renderUI(
			<CommandPalette open={false} onOpenChange={onOpenChange}>
				<div>Items</div>
			</CommandPalette>,
		)

		pressModK({ isComposing: true })

		expect(onOpenChange).not.toHaveBeenCalled()
	})

	// Safari reports keyCode 229 with `isComposing` false on a key that an IME takes.
	it.each([
		['closed', false],
		['open', true],
	])('leaves the shortcut to the IME on a Safari keyCode 229 press while %s', (_, open) => {
		const onOpenChange = vi.fn()

		renderUI(
			<CommandPalette open={open} onOpenChange={onOpenChange}>
				<div>Items</div>
			</CommandPalette>,
		)

		pressModK({ keyCode: 229 })

		expect(onOpenChange).not.toHaveBeenCalled()
	})

	it('keeps an open palette open on the OS auto-repeat of a held shortcut', () => {
		const onOpenChange = vi.fn()

		renderUI(
			<CommandPalette open onOpenChange={onOpenChange}>
				<div>Items</div>
			</CommandPalette>,
		)

		pressModK({ repeat: true })

		expect(onOpenChange).not.toHaveBeenCalled()
	})

	it('does not open from a form field outside the palette', () => {
		const onOpenChange = vi.fn()

		renderUI(
			<>
				<input aria-label="Notes" />
				<CommandPalette open={false} onOpenChange={onOpenChange}>
					<div>Items</div>
				</CommandPalette>
			</>,
		)

		fireEvent.keyDown(screen.getByRole('textbox', { name: 'Notes' }), MOD_K)

		expect(onOpenChange).not.toHaveBeenCalled()
	})

	it('closes the palette from its own search field', () => {
		const onOpenChange = vi.fn()

		renderUI(
			<CommandPalette open onOpenChange={onOpenChange}>
				<div>Items</div>
			</CommandPalette>,
		)

		fireEvent.keyDown(screen.getByRole('combobox'), MOD_K)

		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	it('toggles one palette for each press when two are mounted', () => {
		const first = vi.fn()

		const second = vi.fn()

		renderUI(
			<>
				<CommandPalette open={false} onOpenChange={first}>
					<div>First</div>
				</CommandPalette>
				<CommandPalette open={false} onOpenChange={second}>
					<div>Second</div>
				</CommandPalette>
			</>,
		)

		pressModK()

		expect(first.mock.calls.length + second.mock.calls.length).toBe(1)
	})

	it('closes the open palette, and opens no other, when two are mounted', () => {
		const closed = vi.fn()

		const open = vi.fn()

		renderUI(
			<>
				<CommandPalette open={false} onOpenChange={closed}>
					<div>Closed</div>
				</CommandPalette>
				<CommandPalette open onOpenChange={open}>
					<div>Open</div>
				</CommandPalette>
			</>,
		)

		// A press on the Close button of the open palette: focus can rest there,
		// and it is not a form field, so the closed palette would also take it.
		fireEvent.keyDown(screen.getByRole('button', { name: 'Close' }), MOD_K)

		expect(open).toHaveBeenCalledWith(false)

		expect(closed).not.toHaveBeenCalled()
	})

	it('does not bind a shortcut when triggerShortcut is false', () => {
		const onOpenChange = vi.fn()

		renderUI(
			<CommandPalette open={false} onOpenChange={onOpenChange} triggerShortcut={false}>
				<div>Items</div>
			</CommandPalette>,
		)

		pressModK()

		expect(onOpenChange).not.toHaveBeenCalled()
	})

	it('accepts a custom shortcut string', () => {
		const onOpenChange = vi.fn()

		renderUI(
			<CommandPalette open={false} onOpenChange={onOpenChange} triggerShortcut="Shift+KeyP">
				<div>Items</div>
			</CommandPalette>,
		)

		window.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'P', code: 'KeyP', shiftKey: true, bubbles: true }),
		)

		expect(onOpenChange).toHaveBeenCalledWith(true)
	})

	it('accepts an array of shortcuts', () => {
		const onOpenChange = vi.fn()

		renderUI(
			<CommandPalette
				open={false}
				onOpenChange={onOpenChange}
				triggerShortcut={['Shift+KeyP', 'Shift+KeyQ']}
			>
				<div>Items</div>
			</CommandPalette>,
		)

		window.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Q', code: 'KeyQ', shiftKey: true, bubbles: true }),
		)

		expect(onOpenChange).toHaveBeenCalledWith(true)
	})
})

describe('CommandPalette open/close transitions', () => {
	it('clears the query when the palette transitions from open to closed', async () => {
		const { rerender } = renderUI(
			<CommandPalette open onOpenChange={() => {}}>
				<CommandPaletteItem>Run</CommandPaletteItem>
			</CommandPalette>,
		)

		const input = screen.getByRole('combobox') as HTMLInputElement

		const user = setupUser()

		await user.type(input, 'p')

		expect(input.value.length).toBeGreaterThan(0)

		rerender(
			<CommandPalette open={false} onOpenChange={() => {}}>
				<CommandPaletteItem>Run</CommandPaletteItem>
			</CommandPalette>,
		)

		rerender(
			<CommandPalette open onOpenChange={() => {}}>
				<CommandPaletteItem>Run</CommandPaletteItem>
			</CommandPalette>,
		)

		const reopenedInput = screen.getByRole('combobox') as HTMLInputElement

		expect(reopenedInput.value).toBe('')
	})

	it('focuses the input on open', () => {
		renderUI(
			<CommandPalette open onOpenChange={() => {}}>
				<CommandPaletteItem>Run</CommandPaletteItem>
			</CommandPalette>,
		)

		expect(document.activeElement).toBe(screen.getByRole('combobox'))
	})
})

describe('CommandPalette onActiveChange', () => {
	it('reports the option the arrow keys highlight', async () => {
		const onActiveChange = vi.fn()

		renderUI(
			<CommandPalette open onOpenChange={() => {}} onActiveChange={onActiveChange}>
				<CommandPaletteItem>Alpha</CommandPaletteItem>
				<CommandPaletteItem>Beta</CommandPaletteItem>
			</CommandPalette>,
		)

		const user = setupUser()

		// Nothing is highlighted until the first arrow key.
		expect(onActiveChange).not.toHaveBeenCalled()

		await user.keyboard('{ArrowDown}')

		const options = screen.getAllByRole('option')

		// The id is what `aria-activedescendant` carries, which is the readout this
		// callback replaces.
		expect(onActiveChange).toHaveBeenCalledExactlyOnceWith(
			screen.getByRole('combobox').getAttribute('aria-activedescendant'),
		)

		expect(onActiveChange).toHaveBeenLastCalledWith(options[0]?.id)

		await user.keyboard('{ArrowDown}')

		expect(onActiveChange).toHaveBeenLastCalledWith(options[1]?.id)

		expect(onActiveChange).toHaveBeenCalledTimes(2)
	})

	// A reserved textbox key never reaches roving, so the highlight does not move
	// and there is nothing to report.
	it('says nothing for a key the textbox keeps', async () => {
		const onActiveChange = vi.fn()

		renderUI(
			<CommandPalette open onOpenChange={() => {}} onActiveChange={onActiveChange}>
				<CommandPaletteItem>Alpha</CommandPaletteItem>
				<CommandPaletteItem>Beta</CommandPaletteItem>
			</CommandPalette>,
		)

		const user = setupUser()

		await user.keyboard('{ArrowDown}')

		onActiveChange.mockClear()

		await user.keyboard('{End}')

		expect(onActiveChange).not.toHaveBeenCalled()
	})

	it('reports the top result on a filter change', async () => {
		const onActiveChange = vi.fn()

		renderUI(<FilteredPalette onActiveChange={onActiveChange} />)

		const user = setupUser()

		await user.type(screen.getByRole('combobox'), 'gam')

		expect(onActiveChange).toHaveBeenLastCalledWith(screen.getByRole('option').id)
	})

	it('reports null when the palette closes', async () => {
		const onActiveChange = vi.fn()

		const { rerender } = renderUI(
			<CommandPalette open onOpenChange={() => {}} onActiveChange={onActiveChange}>
				<CommandPaletteItem>Alpha</CommandPaletteItem>
			</CommandPalette>,
		)

		const user = setupUser()

		await user.keyboard('{ArrowDown}')

		expect(onActiveChange.mock.calls.at(-1)?.[0]).toBeTruthy()

		rerender(
			<CommandPalette open={false} onOpenChange={() => {}} onActiveChange={onActiveChange}>
				<CommandPaletteItem>Alpha</CommandPaletteItem>
			</CommandPalette>,
		)

		expect(onActiveChange).toHaveBeenLastCalledWith(null)
	})
})

describe('CommandPalette uncontrolled mode', () => {
	const MOD_K = { key: 'k', code: 'KeyK', ctrlKey: true, bubbles: true, cancelable: true }

	it('opens from defaultOpen and closes from the Close button', async () => {
		const onOpenChange = vi.fn()

		renderUI(
			<CommandPalette defaultOpen onOpenChange={onOpenChange}>
				<div>Items</div>
			</CommandPalette>,
		)

		expect(bySlot(document.body, 'command-palette-input')).toBeInTheDocument()

		await setupUser().click(screen.getByRole('button', { name: 'Close' }))

		expect(onOpenChange).toHaveBeenCalledWith(false)

		expect(bySlot(document.body, 'command-palette-input')).not.toBeInTheDocument()
	})

	it('opens from the shortcut with no open prop', () => {
		renderUI(
			<CommandPalette>
				<div>Items</div>
			</CommandPalette>,
		)

		expect(bySlot(document.body, 'command-palette-input')).not.toBeInTheDocument()

		act(() => {
			window.dispatchEvent(new KeyboardEvent('keydown', MOD_K))
		})

		expect(bySlot(document.body, 'command-palette-input')).toBeInTheDocument()
	})
})

describe('CommandPalette glass', () => {
	it('gives glass to the Dialog panel', () => {
		renderUI(
			<CommandPalette open glass>
				<div>Items</div>
			</CommandPalette>,
		)

		expect(screen.getByRole('dialog')).toHaveAttribute('data-glass', '')
	})
})
