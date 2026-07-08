import { describe, expect, it, vi } from 'vitest'
import {
	ContextMenu,
	type ContextMenuItem,
	mergeContextMenuItems,
	resolveContextMenuEntries,
} from '../../components/context-menu'
import { bySlot, fireEvent, noop, renderUI, screen } from '../helpers'

const defaults: ContextMenuItem[] = [
	{ key: 'a', label: 'Alpha', onSelect: noop },
	{ key: 'b', label: 'Bravo', onSelect: noop },
]

/** The visible label of every open menu item, in DOM order. */
const menuItemLabels = (): string[] =>
	screen.getAllByRole('menuitem').map((item) => item.textContent ?? '')

describe('resolveContextMenuEntries', () => {
	it('returns the defaults alone when no config is given', () => {
		expect(resolveContextMenuEntries(undefined, defaults)).toEqual(defaults)
	})

	it('drops the defaults when defaultItems is false', () => {
		const items: ContextMenuItem[] = [{ key: 'c', label: 'Custom', onSelect: noop }]

		expect(resolveContextMenuEntries({ items, defaultItems: false }, defaults)).toEqual(items)
	})

	it('places a separator between the defaults and custom items when both show', () => {
		const items: ContextMenuItem[] = [{ key: 'c', label: 'Custom', onSelect: noop }]

		const entries = resolveContextMenuEntries({ items }, defaults)

		expect(entries).toHaveLength(4)

		expect(entries[2]).toMatchObject({ separator: true })

		// Default order: defaults first, then the separator, then the custom block.
		expect(entries[0]).toBe(defaults[0])
		expect(entries[3]).toBe(items[0])
	})

	it('orders the custom items before the defaults when position is "before"', () => {
		const items: ContextMenuItem[] = [{ key: 'c', label: 'Custom', onSelect: noop }]

		const entries = resolveContextMenuEntries({ items, position: 'before' }, defaults)

		expect(entries[0]).toBe(items[0])
		expect(entries[1]).toMatchObject({ separator: true })
		expect(entries[2]).toBe(defaults[0])
	})

	it('inserts no separator when only one group is present', () => {
		expect(resolveContextMenuEntries({ items: [] }, defaults)).toEqual(defaults)

		expect(
			resolveContextMenuEntries({ items: defaults, defaultItems: false }, []),
		).not.toContainEqual(expect.objectContaining({ separator: true }))
	})
})

describe('mergeContextMenuItems', () => {
	it('joins non-empty groups with a separator between each', () => {
		const alpha: ContextMenuItem = { key: 'a', label: 'Alpha', onSelect: noop }
		const bravo: ContextMenuItem = { key: 'b', label: 'Bravo', onSelect: noop }

		const merged = mergeContextMenuItems([[alpha], [], [bravo]])

		expect(merged).toHaveLength(3)
		expect(merged[1]).toMatchObject({ separator: true })
	})

	it('is empty for all-empty groups, so the host leaves the native menu alone', () => {
		expect(mergeContextMenuItems([[], []])).toEqual([])
	})
})

describe('ContextMenu', () => {
	const surface = <div data-testid="surface">Right-click</div>

	it('opens the default items on a right-click', () => {
		renderUI(<ContextMenu defaults={defaults}>{surface}</ContextMenu>)

		expect(screen.queryByRole('menu')).not.toBeInTheDocument()

		fireEvent.contextMenu(screen.getByTestId('surface'))

		expect(screen.getByRole('menuitem', { name: 'Alpha' })).toBeInTheDocument()
		expect(screen.getByRole('menuitem', { name: 'Bravo' })).toBeInTheDocument()
	})

	it('runs an item onSelect and closes the menu', () => {
		const onSelect = vi.fn()

		renderUI(
			<ContextMenu defaults={[{ key: 'a', label: 'Alpha', onSelect }]}>{surface}</ContextMenu>,
		)

		fireEvent.contextMenu(screen.getByTestId('surface'))

		fireEvent.click(screen.getByRole('menuitem', { name: 'Alpha' }))

		expect(onSelect).toHaveBeenCalledOnce()

		expect(screen.queryByRole('menu')).not.toBeInTheDocument()
	})

	it('merges custom items after the defaults with a separator between', () => {
		renderUI(
			<ContextMenu defaults={defaults} items={[{ key: 'c', label: 'Custom', onSelect: noop }]}>
				{surface}
			</ContextMenu>,
		)

		fireEvent.contextMenu(screen.getByTestId('surface'))

		expect(menuItemLabels()).toEqual(['Alpha', 'Bravo', 'Custom'])

		expect(bySlot(document.body, 'menu-separator')).toBeInTheDocument()
	})

	it('shows only the custom items when defaultItems is false', () => {
		renderUI(
			<ContextMenu
				defaults={defaults}
				items={[{ key: 'c', label: 'Custom', onSelect: noop }]}
				defaultItems={false}
			>
				{surface}
			</ContextMenu>,
		)

		fireEvent.contextMenu(screen.getByTestId('surface'))

		expect(menuItemLabels()).toEqual(['Custom'])
	})

	it('leaves the native menu (opens nothing) when there is nothing to show', () => {
		renderUI(<ContextMenu defaults={[]}>{surface}</ContextMenu>)

		fireEvent.contextMenu(screen.getByTestId('surface'))

		expect(screen.queryByRole('menu')).not.toBeInTheDocument()
	})

	it('renders the content untouched when disabled', () => {
		renderUI(
			<ContextMenu defaults={defaults} disabled>
				{surface}
			</ContextMenu>,
		)

		fireEvent.contextMenu(screen.getByTestId('surface'))

		expect(screen.queryByRole('menu')).not.toBeInTheDocument()
	})
})
