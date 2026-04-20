import { describe, expect, it, vi } from 'vitest'
import { ColumnManager, type ColumnManagerItem } from '../../components/column-manager'
import { allBySlot, bySlot, renderUI, screen, userEvent } from '../helpers'

const columns: ColumnManagerItem[] = [
	{ id: 'name', title: 'Name', pinned: true },
	{ id: 'email', title: 'Email' },
	{ id: 'role', title: 'Role' },
]

describe('ColumnManager', () => {
	it('renders with data-slot="column-manager"', () => {
		const { container } = renderUI(<ColumnManager columns={columns} />)

		const el = bySlot(container, 'column-manager')

		expect(el).toBeInTheDocument()
	})

	it('renders one item per column', () => {
		const { container } = renderUI(<ColumnManager columns={columns} />)

		expect(allBySlot(container, 'column-manager-item')).toHaveLength(3)
	})

	it('marks pinned columns with data-pinned', () => {
		const { container } = renderUI(<ColumnManager columns={columns} />)

		const items = allBySlot(container, 'column-manager-item')

		expect(items[0]).toHaveAttribute('data-pinned')
		expect(items[1]).not.toHaveAttribute('data-pinned')
	})

	it('toggles a column visibility when its checkbox is clicked', async () => {
		const onHiddenChange = vi.fn()

		renderUI(
			<ColumnManager columns={columns} defaultHidden={new Set()} onHiddenChange={onHiddenChange} />,
		)

		const user = userEvent.setup()

		await user.click(screen.getByRole('checkbox', { name: 'Show Email' }))

		expect(onHiddenChange).toHaveBeenCalledWith(new Set(['email']))
	})

	it('pinned column checkbox is disabled and cannot toggle', () => {
		renderUI(<ColumnManager columns={columns} />)

		const checkbox = screen.getByRole('checkbox', { name: /Name \(pinned\)/ })

		expect(checkbox).toBeDisabled()
	})

	it('renders a save-preset button only when onSavePreset is provided', () => {
		const { rerender } = renderUI(<ColumnManager columns={columns} />)

		expect(screen.queryByRole('button', { name: 'Save as preset' })).not.toBeInTheDocument()

		rerender(<ColumnManager columns={columns} onSavePreset={() => {}} />)

		expect(screen.getByRole('button', { name: 'Save as preset' })).toBeInTheDocument()
	})

	it('invokes onSavePreset with the current order and hidden columns', async () => {
		const onSavePreset = vi.fn()

		renderUI(
			<ColumnManager
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
		const { container } = renderUI(<ColumnManager columns={columns} className="custom" />)

		const el = bySlot(container, 'column-manager')

		expect(el?.className).toContain('custom')
	})
})
