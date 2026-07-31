import { describe, expect, it, vi } from 'vitest'
import {
	ContextMenu,
	type ContextMenuEntry,
	type ContextMenuItem,
	ContextMenuList,
	mergeContextMenuItems,
	resolveContextMenuEntries,
} from '../../components/context-menu'
import { Menu, MenuContent } from '../../components/menu'
import { act, bySlot, fireEvent, noop, renderUI, screen, withFakeTime } from '../helpers'

const defaults: ContextMenuItem[] = [
	{ key: 'a', label: 'Alpha', onAction: noop },
	{ key: 'b', label: 'Bravo', onAction: noop },
]

/** The visible label of every open menu item, in DOM order. */
const menuItemLabels = (): string[] =>
	screen.getAllByRole('menuitem').map((item) => item.textContent ?? '')

describe('resolveContextMenuEntries', () => {
	it('returns the defaults alone when no config is given', () => {
		expect(resolveContextMenuEntries(undefined, defaults)).toEqual(defaults)
	})

	it('drops the defaults when defaultItems is false', () => {
		const items: ContextMenuItem[] = [{ key: 'c', label: 'Custom', onAction: noop }]

		expect(resolveContextMenuEntries({ items, defaultItems: false }, defaults)).toEqual(items)
	})

	it('places a separator between the defaults and custom items when both show', () => {
		const items: ContextMenuItem[] = [{ key: 'c', label: 'Custom', onAction: noop }]

		const entries = resolveContextMenuEntries({ items }, defaults)

		expect(entries).toHaveLength(4)

		expect(entries[2]).toMatchObject({ separator: true })

		// Default order: defaults first, then the separator, then the custom block.
		expect(entries[0]).toBe(defaults[0])
		expect(entries[3]).toBe(items[0])
	})

	it('orders the custom items before the defaults when position is "before"', () => {
		const items: ContextMenuItem[] = [{ key: 'c', label: 'Custom', onAction: noop }]

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
		const alpha: ContextMenuItem = { key: 'a', label: 'Alpha', onAction: noop }
		const bravo: ContextMenuItem = { key: 'b', label: 'Bravo', onAction: noop }

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

	it('runs an item onAction and closes the menu', () => {
		const onAction = vi.fn()

		renderUI(
			<ContextMenu defaults={[{ key: 'a', label: 'Alpha', onAction }]}>{surface}</ContextMenu>,
		)

		fireEvent.contextMenu(screen.getByTestId('surface'))

		fireEvent.click(screen.getByRole('menuitem', { name: 'Alpha' }))

		expect(onAction).toHaveBeenCalledOnce()

		expect(screen.queryByRole('menu')).not.toBeInTheDocument()
	})

	it('merges custom items after the defaults with a separator between', () => {
		renderUI(
			<ContextMenu defaults={defaults} items={[{ key: 'c', label: 'Custom', onAction: noop }]}>
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
				items={[{ key: 'c', label: 'Custom', onAction: noop }]}
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

describe('ContextMenuList submenus', () => {
	/** A right-click surface rendering `entries` through the shared list renderer. */
	const Harness = ({ entries }: { entries: ContextMenuEntry[] }) => (
		<Menu>
			<div data-testid="surface">Right-click</div>

			<MenuContent>
				<ContextMenuList entries={entries} />
			</MenuContent>
		</Menu>
	)

	const open = (entries: ContextMenuEntry[]) => {
		renderUI(<Harness entries={entries} />)

		fireEvent.contextMenu(screen.getByTestId('surface'))
	}

	const pinEntries = (onAction = noop): ContextMenuEntry[] => [
		{
			key: 'pin',
			label: 'Pin',
			items: [
				{ key: 'pin-left', label: 'Pin left', onAction },
				{ key: 'pin-right', label: 'Pin right', onAction: noop },
			],
		},
	]

	it('renders a submenu entry as one parent row, its own rows withheld until opened', () => {
		open(pinEntries())

		const trigger = screen.getByRole('menuitem', { name: 'Pin' })

		expect(trigger).toHaveAttribute('aria-haspopup', 'menu')

		expect(trigger).toHaveAttribute('aria-expanded', 'false')

		expect(screen.queryByRole('menuitem', { name: 'Pin left' })).not.toBeInTheDocument()
	})

	it('opens the submenu on hover without moving focus', () => {
		open(pinEntries())

		const trigger = screen.getByRole('menuitem', { name: 'Pin' })

		fireEvent.pointerEnter(trigger, { pointerType: 'mouse' })

		expect(screen.getByRole('menuitem', { name: 'Pin left' })).toBeInTheDocument()

		// Hover is not a commitment: focus stays where the user left it.
		expect(document.activeElement).not.toBe(screen.getByRole('menuitem', { name: 'Pin left' }))
	})

	it('closes once the pointer leaves both the parent row and the panel', async () => {
		await withFakeTime(async (clock) => {
			open(pinEntries())

			const trigger = screen.getByRole('menuitem', { name: 'Pin' })

			fireEvent.pointerEnter(trigger, { pointerType: 'mouse' })

			fireEvent.pointerLeave(trigger)

			// The grace period keeps it open for a diagonal sweep into the panel.
			await clock.advance(50)

			expect(screen.getByRole('menuitem', { name: 'Pin left' })).toBeInTheDocument()

			await clock.advance(200)

			expect(screen.queryByRole('menuitem', { name: 'Pin left' })).not.toBeInTheDocument()
		})
	})

	it('opens on Enter and seats focus on the first row', () => {
		open(pinEntries())

		fireEvent.keyDown(screen.getByRole('menuitem', { name: 'Pin' }), { key: 'Enter' })

		expect(screen.getByRole('menuitem', { name: 'Pin left' })).toHaveFocus()
	})

	it('leaves the direction keys alone — the panel picks its own side', () => {
		open(pinEntries())

		const trigger = screen.getByRole('menuitem', { name: 'Pin' })

		fireEvent.keyDown(trigger, { key: 'ArrowRight' })

		expect(screen.queryByRole('menuitem', { name: 'Pin left' })).not.toBeInTheDocument()

		fireEvent.keyDown(trigger, { key: ' ' })

		fireEvent.keyDown(screen.getByRole('menuitem', { name: 'Pin left' }), { key: 'ArrowLeft' })

		expect(screen.getByRole('menuitem', { name: 'Pin left' })).toBeInTheDocument()
	})

	it('closes when the roving cursor moves off the parent row', () => {
		open([...pinEntries(), { key: 'copy', label: 'Copy', onAction: noop }])

		const trigger = screen.getByRole('menuitem', { name: 'Pin' })

		// Hover-opened, so the cursor is still on the parent row rather than inside
		// the panel.
		fireEvent.pointerEnter(trigger, { pointerType: 'mouse' })

		act(() => trigger.focus())

		expect(screen.getByRole('menuitem', { name: 'Pin left' })).toBeInTheDocument()

		// Roving on to the next row collapses the submenu behind it. Focus is moved
		// directly rather than by arrow: the mocked floating engine renders the
		// panel inline here, so the parent's roving would step into its rows.
		act(() => screen.getByRole('menuitem', { name: 'Copy' }).focus())

		expect(screen.queryByRole('menuitem', { name: 'Pin left' })).not.toBeInTheDocument()
	})

	it('runs a submenu row and closes the whole menu', () => {
		const onAction = vi.fn()

		open(pinEntries(onAction))

		fireEvent.click(screen.getByRole('menuitem', { name: 'Pin' }))

		fireEvent.click(screen.getByRole('menuitem', { name: 'Pin left' }))

		expect(onAction).toHaveBeenCalledOnce()

		// Selecting inside a submenu dismisses the menu it hangs off, not just itself.
		expect(screen.queryByRole('menu')).not.toBeInTheDocument()
	})

	it('holds Tab inside the menu, cycling its rows', () => {
		open([
			{ key: 'copy', label: 'Copy', onAction: noop },
			{ key: 'paste', label: 'Paste', onAction: noop },
		])

		const menu = screen.getByRole('menu')

		fireEvent.keyDown(menu, { key: 'Tab' })

		expect(screen.getByRole('menuitem', { name: 'Copy' })).toHaveFocus()

		fireEvent.keyDown(screen.getByRole('menuitem', { name: 'Copy' }), { key: 'Tab' })

		expect(screen.getByRole('menuitem', { name: 'Paste' })).toHaveFocus()

		// Wraps at the end rather than carrying focus out to the page behind.
		fireEvent.keyDown(screen.getByRole('menuitem', { name: 'Paste' }), { key: 'Tab' })

		expect(screen.getByRole('menuitem', { name: 'Copy' })).toHaveFocus()

		fireEvent.keyDown(screen.getByRole('menuitem', { name: 'Copy' }), {
			key: 'Tab',
			shiftKey: true,
		})

		expect(screen.getByRole('menuitem', { name: 'Paste' })).toHaveFocus()
	})

	it('holds Tab inside an open submenu, not spilling back to the parent menu', () => {
		open(pinEntries())

		const trigger = screen.getByRole('menuitem', { name: 'Pin' })

		fireEvent.keyDown(trigger, { key: 'Enter' })

		fireEvent.keyDown(screen.getByRole('menuitem', { name: 'Pin left' }), { key: 'Tab' })

		expect(screen.getByRole('menuitem', { name: 'Pin right' })).toHaveFocus()

		fireEvent.keyDown(screen.getByRole('menuitem', { name: 'Pin right' }), { key: 'Tab' })

		expect(screen.getByRole('menuitem', { name: 'Pin left' })).toHaveFocus()
	})

	it('keeps arrow roving inside the submenu, off the parent menu', () => {
		open([...pinEntries(), { key: 'copy', label: 'Copy', onAction: noop }])

		fireEvent.keyDown(screen.getByRole('menuitem', { name: 'Pin' }), { key: 'Enter' })

		// The panel portals out but stays a React child of its parent row, so its
		// keystrokes must not reach the enclosing menu's roving.
		fireEvent.keyDown(screen.getByRole('menuitem', { name: 'Pin left' }), { key: 'ArrowDown' })

		expect(screen.getByRole('menuitem', { name: 'Pin right' })).toHaveFocus()
	})

	it('closes only the submenu on Escape, the menu behind it on the next press', () => {
		open(pinEntries())

		const trigger = screen.getByRole('menuitem', { name: 'Pin' })

		fireEvent.keyDown(trigger, { key: 'Enter' })

		fireEvent.keyDown(screen.getByRole('menuitem', { name: 'Pin left' }), { key: 'Escape' })

		expect(screen.queryByRole('menuitem', { name: 'Pin left' })).not.toBeInTheDocument()

		// The menu it hangs off survives, with the cursor back on its parent row.
		expect(trigger).toHaveFocus()

		fireEvent.keyDown(trigger, { key: 'Escape' })

		expect(screen.queryByRole('menu')).not.toBeInTheDocument()
	})

	it('closes a hover-opened submenu on Escape from its parent row', () => {
		open(pinEntries())

		const trigger = screen.getByRole('menuitem', { name: 'Pin' })

		fireEvent.pointerEnter(trigger, { pointerType: 'mouse' })

		fireEvent.keyDown(trigger, { key: 'Escape' })

		expect(screen.queryByRole('menuitem', { name: 'Pin left' })).not.toBeInTheDocument()

		expect(screen.getByRole('menu')).toBeInTheDocument()
	})

	it('nests a submenu within a submenu', () => {
		open([
			{
				key: 'outer',
				label: 'Outer',
				items: [{ key: 'inner', label: 'Inner', items: [{ key: 'leaf', label: 'Leaf' }] }],
			},
		])

		fireEvent.click(screen.getByRole('menuitem', { name: 'Outer' }))

		fireEvent.click(screen.getByRole('menuitem', { name: 'Inner' }))

		expect(screen.getByRole('menuitem', { name: 'Leaf' })).toBeInTheDocument()
	})

	it('never opens a disabled submenu', () => {
		open([
			{ key: 'pin', label: 'Pin', disabled: true, items: [{ key: 'left', label: 'Pin left' }] },
		])

		const trigger = screen.getByRole('menuitem', { name: 'Pin', hidden: true })

		fireEvent.click(trigger)

		fireEvent.keyDown(trigger, { key: 'Enter' })

		expect(screen.queryByRole('menuitem', { name: 'Pin left' })).not.toBeInTheDocument()
	})
})
