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
})
