import { describe, expect, it, vi } from 'vitest'
import {
	DataTableColumnManager,
	type DataTableColumnManagerItem,
} from '../../components/data-table'
import { DataTableColumnManagerDialog } from '../../components/data-table/data-table-column-manager-dialog'
import { allBySlot, fireEvent, renderUI, screen, userEvent } from '../helpers'

const columns: DataTableColumnManagerItem[] = [
	{ id: 'name', title: 'Name', pinned: true },
	{ id: 'email', title: 'Email' },
	{ id: 'role', title: 'Role' },
]

describe('DataTableColumnManager', () => {
	it('renders one item per column', () => {
		const { container } = renderUI(<DataTableColumnManager columns={columns} />)

		expect(allBySlot(container, 'list-item')).toHaveLength(3)
	})

	it('toggles a column visibility when its checkbox is clicked', async () => {
		const onHiddenChange = vi.fn()

		renderUI(
			<DataTableColumnManager
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
		renderUI(<DataTableColumnManager columns={columns} />)

		const checkbox = screen.getByRole('checkbox', { name: /Name \(pinned\)/ })

		expect(checkbox).toBeDisabled()
	})

	it('reorders an orderable column via the keyboard, keeping pinned columns first', () => {
		const onOrderChange = vi.fn()

		const { container } = renderUI(
			<DataTableColumnManager columns={columns} onOrderChange={onOrderChange} />,
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

		// The DataTable's full order includes the selection and actions columns,
		// which are filtered out of the manager's `columns`; they must survive
		// a reorder in their original positions rather than being dropped.
		const { container } = renderUI(
			<DataTableColumnManager
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
		const { rerender } = renderUI(<DataTableColumnManager columns={columns} />)

		expect(screen.queryByRole('button', { name: 'Save as preset' })).not.toBeInTheDocument()

		rerender(<DataTableColumnManager columns={columns} onSavePreset={() => {}} />)

		expect(screen.getByRole('button', { name: 'Save as preset' })).toBeInTheDocument()
	})

	it('invokes onSavePreset with the current order and hidden columns', async () => {
		const onSavePreset = vi.fn()

		renderUI(
			<DataTableColumnManager
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
			<DataTableColumnManager
				columns={columns}
				onSavePreset={() => {}}
				savePresetLabel="Pin layout"
			/>,
		)

		expect(screen.getByRole('button', { name: 'Pin layout' })).toBeInTheDocument()
	})

	it('renders pinned and orderable columns in separate groups', () => {
		const { container } = renderUI(<DataTableColumnManager columns={columns} />)

		const lists = container.querySelectorAll('ul, ol')

		// Two lists rendered: one for pinned, one for orderable columns.
		expect(lists.length).toBeGreaterThanOrEqual(2)
	})

	it('does not render the pinned section when no columns are pinned', () => {
		const { container } = renderUI(
			<DataTableColumnManager
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
			<DataTableColumnManager
				columns={[
					{ id: 'name', title: 'Name', pinned: true },
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
			<DataTableColumnManager
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
		renderUI(<DataTableColumnManager columns={columns} defaultOrder={['name', 'role', 'email']} />)

		const labels = Array.from(document.querySelectorAll('label'))
			.map((l) => l.textContent)
			.filter((t): t is string => !!t && t.length > 0)

		expect(labels).toEqual(['Name', 'Role', 'Email'])
	})

	it('falls back to a generated label when a pinned column title is non-string', () => {
		renderUI(
			<DataTableColumnManager columns={[{ id: 'name', title: <span>Name</span>, pinned: true }]} />,
		)

		// The aria-label falls back to the id when title is non-string.
		expect(screen.getByRole('checkbox', { name: /name \(pinned\)/i })).toBeInTheDocument()
	})

	it('toggles back to visible when the same checkbox is clicked twice', async () => {
		const onHiddenChange = vi.fn()

		renderUI(
			<DataTableColumnManager
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

describe('DataTableColumnManagerDialog', () => {
	it('opens from the toolbar trigger and closes via the Done button', async () => {
		const user = userEvent.setup()

		renderUI(
			<DataTableColumnManagerDialog
				label="Columns"
				columns={columns}
				order={['name', 'email', 'role']}
				onOrderChange={() => {}}
				hidden={new Set()}
				onHiddenChange={() => {}}
			/>,
		)

		expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: 'Columns' }))

		expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: 'Done' }))

		expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument()
	})
})
