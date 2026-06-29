import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { GridColumnManager, type GridColumnManagerItem } from '../../modules/grid'
import { GridColumnManagerDialog } from '../../modules/grid/grid-column-manager-dialog'
import { allBySlot, fireEvent, renderUI, screen, userEvent } from '../helpers'

const columns: GridColumnManagerItem[] = [
	{ id: 'name', title: 'Name', pinned: 'left' },
	{ id: 'email', title: 'Email' },
	{ id: 'role', title: 'Role' },
]

describe('GridColumnManager', () => {
	it('renders one item per column', () => {
		const { container } = renderUI(<GridColumnManager columns={columns} />)

		expect(allBySlot(container, 'list-item')).toHaveLength(3)
	})

	it('toggles a column visibility when its checkbox is clicked', async () => {
		const onHiddenChange = vi.fn()

		renderUI(
			<GridColumnManager
				columns={columns}
				defaultHidden={new Set()}
				onHiddenChange={onHiddenChange}
			/>,
		)

		const user = userEvent.setup()

		await user.click(screen.getByRole('checkbox', { name: 'Show Email' }))

		expect(onHiddenChange).toHaveBeenCalledWith(new Set(['email']))
	})

	it('pinned column checkbox is disabled and cannot toggle', () => {
		renderUI(<GridColumnManager columns={columns} />)

		const checkbox = screen.getByRole('checkbox', { name: /Name \(pinned\)/ })

		expect(checkbox).toBeDisabled()
	})

	it('reorders an orderable column via the keyboard, keeping pinned columns first', () => {
		const onOrderChange = vi.fn()

		const { container } = renderUI(
			<GridColumnManager columns={columns} onOrderChange={onOrderChange} />,
		)

		// Items render pinned-list first, then the orderable list: [name, email, role].
		const email = allBySlot(container, 'list-item')[1] as HTMLElement

		email.focus()

		// Space lifts, ArrowDown moves the lifted item down and commits the reorder.
		fireEvent.keyDown(email, { key: ' ' })

		fireEvent.keyDown(email, { key: 'ArrowDown' })

		expect(onOrderChange).toHaveBeenCalledWith(['name', 'role', 'email'])
	})

	it('preserves ids outside the manager set (select/actions) in place on reorder', () => {
		const onOrderChange = vi.fn()

		// The Grid's full order includes the selection and actions columns,
		// which are filtered out of the manager's `columns`; they must survive
		// a reorder in their original positions rather than being dropped.
		const { container } = renderUI(
			<GridColumnManager
				columns={columns}
				order={['select', 'name', 'email', 'role', 'actions']}
				onOrderChange={onOrderChange}
			/>,
		)

		const email = allBySlot(container, 'list-item')[1] as HTMLElement

		email.focus()

		fireEvent.keyDown(email, { key: ' ' })

		fireEvent.keyDown(email, { key: 'ArrowDown' })

		expect(onOrderChange).toHaveBeenCalledWith(['select', 'name', 'role', 'email', 'actions'])
	})

	it('renders a save-preset button only when onSavePreset is provided', () => {
		const { rerender } = renderUI(<GridColumnManager columns={columns} />)

		expect(screen.queryByRole('button', { name: 'Save as preset' })).not.toBeInTheDocument()

		rerender(<GridColumnManager columns={columns} onSavePreset={() => {}} />)

		expect(screen.getByRole('button', { name: 'Save as preset' })).toBeInTheDocument()
	})

	it('invokes onSavePreset with the current order and hidden columns', async () => {
		const onSavePreset = vi.fn()

		renderUI(
			<GridColumnManager
				columns={columns}
				defaultHidden={new Set(['role'])}
				onSavePreset={onSavePreset}
			/>,
		)

		const user = userEvent.setup()

		await user.click(screen.getByRole('button', { name: 'Save as preset' }))

		expect(onSavePreset).toHaveBeenCalledWith({
			order: ['name', 'email', 'role'],
			hidden: ['role'],
		})
	})

	it('honors a custom savePresetLabel', () => {
		renderUI(
			<GridColumnManager columns={columns} onSavePreset={() => {}} savePresetLabel="Pin layout" />,
		)

		expect(screen.getByRole('button', { name: 'Pin layout' })).toBeInTheDocument()
	})

	it('renders pinned and orderable columns in separate groups', () => {
		const { container } = renderUI(<GridColumnManager columns={columns} />)

		const lists = container.querySelectorAll('ul, ol')

		// Two lists rendered: one for pinned, one for orderable columns.
		expect(lists.length).toBeGreaterThanOrEqual(2)
	})

	it('does not render the pinned section when no columns are pinned', () => {
		const { container } = renderUI(
			<GridColumnManager
				columns={[
					{ id: 'email', title: 'Email' },
					{ id: 'role', title: 'Role' },
				]}
			/>,
		)

		const lists = container.querySelectorAll('ul, ol')

		expect(lists.length).toBe(1)
	})

	it('marks a hideable=false checkbox as disabled', () => {
		renderUI(
			<GridColumnManager
				columns={[
					{ id: 'name', title: 'Name', pinned: 'left' },
					{ id: 'email', title: 'Email', hideable: false },
				]}
			/>,
		)

		const checkbox = screen.getByRole('checkbox', { name: 'Show Email' })

		expect(checkbox).toBeDisabled()
	})

	it('uses controlled order when provided', () => {
		const onOrderChange = vi.fn()

		renderUI(
			<GridColumnManager
				columns={columns}
				order={['name', 'role', 'email']}
				onOrderChange={onOrderChange}
			/>,
		)

		const labels = Array.from(document.querySelectorAll('label'))
			.map((l) => l.textContent)
			.filter((t): t is string => !!t && t.length > 0)

		// Pinned column "name" stays at the top; orderable list follows controlled order.
		expect(labels).toEqual(['Name', 'Role', 'Email'])
	})

	it('falls back to defaultOrder when no controlled order is provided', () => {
		renderUI(<GridColumnManager columns={columns} defaultOrder={['name', 'role', 'email']} />)

		const labels = Array.from(document.querySelectorAll('label'))
			.map((l) => l.textContent)
			.filter((t): t is string => !!t && t.length > 0)

		expect(labels).toEqual(['Name', 'Role', 'Email'])
	})

	it('falls back to a generated label when a pinned column title is non-string', () => {
		renderUI(
			<GridColumnManager columns={[{ id: 'name', title: <span>Name</span>, pinned: 'left' }]} />,
		)

		// The aria-label falls back to the id when title is non-string.
		expect(screen.getByRole('checkbox', { name: /name \(pinned\)/i })).toBeInTheDocument()
	})

	it('toggles back to visible when the same checkbox is clicked twice', async () => {
		const onHiddenChange = vi.fn()

		renderUI(
			<GridColumnManager
				columns={columns}
				defaultHidden={new Set(['email'])}
				onHiddenChange={onHiddenChange}
			/>,
		)

		const user = userEvent.setup()

		await user.click(screen.getByRole('checkbox', { name: 'Show Email' }))

		expect(onHiddenChange).toHaveBeenLastCalledWith(new Set())
	})
})

describe('GridColumnManager pinning', () => {
	it('renders left-pinned columns prepended and right-pinned appended', () => {
		const cols: GridColumnManagerItem[] = [
			{ id: 'a', title: 'A' },
			{ id: 'b', title: 'B', pinned: 'left' },
			{ id: 'c', title: 'C', pinned: 'right' },
			{ id: 'd', title: 'D' },
		]

		renderUI(<GridColumnManager columns={cols} />)

		const labels = Array.from(document.querySelectorAll('label'))
			.map((l) => l.textContent)
			.filter((t): t is string => !!t && t.length > 0)

		// Left group prepended, the scrolling columns in the middle, right appended.
		expect(labels).toEqual(['B', 'A', 'D', 'C'])
	})

	it('pins a scrolling column to the left through its pin control', () => {
		const onPinChange = vi.fn()

		renderUI(<GridColumnManager columns={columns} onPinChange={onPinChange} />)

		fireEvent.click(screen.getByRole('button', { name: 'Pin Email' }))

		fireEvent.click(screen.getByRole('menuitem', { name: 'Pin left' }))

		expect(onPinChange).toHaveBeenCalledWith('email', 'left')
	})

	it('pins a scrolling column to the right through its pin control', () => {
		const onPinChange = vi.fn()

		renderUI(<GridColumnManager columns={columns} onPinChange={onPinChange} />)

		fireEvent.click(screen.getByRole('button', { name: 'Pin Role' }))

		fireEvent.click(screen.getByRole('menuitem', { name: 'Pin right' }))

		expect(onPinChange).toHaveBeenCalledWith('role', 'right')
	})

	it('offers the opposite edge and Unpin on a pinned column, and unpins on select', () => {
		const onPinChange = vi.fn()

		renderUI(<GridColumnManager columns={columns} onPinChange={onPinChange} />)

		// Name is pinned left: its control offers Pin right and Unpin, not Pin left.
		fireEvent.click(screen.getByRole('button', { name: 'Pin Name' }))

		expect(screen.getByRole('menuitem', { name: 'Pin right' })).toBeInTheDocument()

		expect(screen.queryByRole('menuitem', { name: 'Pin left' })).not.toBeInTheDocument()

		fireEvent.click(screen.getByRole('menuitem', { name: 'Unpin' }))

		expect(onPinChange).toHaveBeenCalledWith('name', false)
	})

	it('shows a locked column with a static lock and no pin control', () => {
		const onPinChange = vi.fn()

		const cols: GridColumnManagerItem[] = [
			{ id: 'id', title: 'ID', locked: 'left' },
			{ id: 'email', title: 'Email' },
		]

		renderUI(<GridColumnManager columns={cols} onPinChange={onPinChange} />)

		// The locked column exposes no interactive pin control...
		expect(screen.queryByRole('button', { name: 'Pin ID' })).not.toBeInTheDocument()

		// ...its checkbox is disabled and marked locked...
		expect(screen.getByRole('checkbox', { name: 'ID (locked)' })).toBeDisabled()

		// ...while the scrolling column still gets one.
		expect(screen.getByRole('button', { name: 'Pin Email' })).toBeInTheDocument()
	})

	it('marks a locked column with a directional edge arrow by side', () => {
		const cols: GridColumnManagerItem[] = [
			{ id: 'name', title: 'Name', locked: 'left' },
			{ id: 'email', title: 'Email' },
			{ id: 'actions', title: 'Actions', locked: 'right' },
		]

		const { container } = renderUI(<GridColumnManager columns={cols} onPinChange={() => {}} />)

		// Locked rows show a directional edge arrow (not a lock glyph): left vs right.
		expect(container.querySelector('.lucide-arrow-left-to-line')).not.toBeNull()

		expect(container.querySelector('.lucide-arrow-right-to-line')).not.toBeNull()
	})

	it('appends a right-locked column to the list', () => {
		const cols: GridColumnManagerItem[] = [
			{ id: 'a', title: 'A' },
			{ id: 'actions', title: 'Actions', locked: 'right' },
		]

		renderUI(<GridColumnManager columns={cols} />)

		const labels = Array.from(document.querySelectorAll('label'))
			.map((l) => l.textContent)
			.filter((t): t is string => !!t && t.length > 0)

		expect(labels).toEqual(['A', 'Actions'])
	})

	it('omits pin controls entirely when no onPinChange handler is given', () => {
		renderUI(<GridColumnManager columns={columns} />)

		// The pinned column still lists (disabled checkbox) but offers no pin button.
		expect(screen.getByRole('checkbox', { name: /Name \(pinned\)/ })).toBeDisabled()

		expect(screen.queryByRole('button', { name: 'Pin Name' })).not.toBeInTheDocument()

		expect(screen.queryByRole('button', { name: 'Pin Email' })).not.toBeInTheDocument()
	})
})

describe('GridColumnManagerDialog', () => {
	// The dialog is purely controlled; its trigger lives in `GridToolbar` (covered
	// through `<Grid>`). The harness drives `open` itself to exercise the dialog.
	function Harness() {
		const [open, setOpen] = useState(false)

		return (
			<>
				<button type="button" onClick={() => setOpen(true)}>
					Open
				</button>

				<GridColumnManagerDialog
					open={open}
					onOpenChange={setOpen}
					label="Manage columns"
					columns={columns}
					order={['name', 'email', 'role']}
					onOrderChange={() => {}}
					hidden={new Set()}
					onHiddenChange={() => {}}
					onPinChange={() => {}}
				/>
			</>
		)
	}

	it('shows the manager while open and closes via the Done button', async () => {
		const user = userEvent.setup()

		renderUI(<Harness />)

		expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: 'Open' }))

		expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: 'Done' }))

		expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument()
	})
})
