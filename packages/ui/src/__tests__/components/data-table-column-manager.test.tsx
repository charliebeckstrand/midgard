import { describe, expect, it, vi } from 'vitest'
import {
	DataTableColumnManager,
	type DataTableColumnManagerItem,
} from '../../components/data-table'
import { allBySlot, bySlot, renderUI, screen, userEvent } from '../helpers'

const columns: DataTableColumnManagerItem[] = [
	{ id: 'name', title: 'Name', pinned: true },
	{ id: 'email', title: 'Email' },
	{ id: 'role', title: 'Role' },
]

describe('DataTableColumnManager', () => {
	it('renders with data-slot="data-table-column-manager"', () => {
		const { container } = renderUI(<DataTableColumnManager columns={columns} />)

		const el = bySlot(container, 'data-table-column-manager')

		expect(el).toBeInTheDocument()
	})

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

	it('applies custom className', () => {
		const { container } = renderUI(<DataTableColumnManager columns={columns} className="custom" />)

		const el = bySlot(container, 'data-table-column-manager')

		expect(el?.className).toContain('custom')
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
