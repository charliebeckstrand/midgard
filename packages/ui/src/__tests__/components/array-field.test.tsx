import { describe, expect, it, vi } from 'vitest'
import { ArrayField } from '../../components/array-field'
import { allBySlot, bySlot, renderUI, screen, userEvent } from '../helpers'

type Row = { id: string; name: string }

const rows: Row[] = [
	{ id: 'a', name: 'Alpha' },
	{ id: 'b', name: 'Beta' },
	{ id: 'c', name: 'Gamma' },
]

describe('ArrayField', () => {
	it('renders a fieldset with data-slot="array-field"', () => {
		const { container } = renderUI(
			<ArrayField items={rows} getKey={(r) => r.id}>
				{(row) => <span>{row.name}</span>}
			</ArrayField>,
		)

		const el = bySlot(container, 'array-field')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('FIELDSET')
	})

	it('renders the legend when provided', () => {
		renderUI(
			<ArrayField legend="Stops" items={rows} getKey={(r) => r.id}>
				{(row) => <span>{row.name}</span>}
			</ArrayField>,
		)

		expect(screen.getByText('Stops')).toBeInTheDocument()
	})

	it('renders one row per item', () => {
		const { container } = renderUI(
			<ArrayField items={rows} getKey={(r) => r.id}>
				{(row) => <span>{row.name}</span>}
			</ArrayField>,
		)

		expect(allBySlot(container, 'array-field-row')).toHaveLength(3)

		expect(screen.getByText('Alpha')).toBeInTheDocument()
		expect(screen.getByText('Gamma')).toBeInTheDocument()
	})

	it('passes a zero-based index to the renderer', () => {
		renderUI(
			<ArrayField items={rows} getKey={(r) => r.id}>
				{(row, { index }) => <span>{`${index}:${row.name}`}</span>}
			</ArrayField>,
		)

		expect(screen.getByText('0:Alpha')).toBeInTheDocument()
		expect(screen.getByText('2:Gamma')).toBeInTheDocument()
	})

	it('omits drag handles when onReorder is not provided', () => {
		const { container } = renderUI(
			<ArrayField items={rows} getKey={(r) => r.id}>
				{(row) => <span>{row.name}</span>}
			</ArrayField>,
		)

		expect(allBySlot(container, 'array-field-handle')).toHaveLength(0)
	})

	it('renders drag handles when onReorder is provided', () => {
		const { container } = renderUI(
			<ArrayField items={rows} getKey={(r) => r.id} onReorder={() => {}}>
				{(row) => <span>{row.name}</span>}
			</ArrayField>,
		)

		expect(allBySlot(container, 'array-field-handle')).toHaveLength(3)
	})

	it('omits the add button when onAdd is not provided', () => {
		const { container } = renderUI(
			<ArrayField items={rows} getKey={(r) => r.id}>
				{(row) => <span>{row.name}</span>}
			</ArrayField>,
		)

		expect(bySlot(container, 'array-field-add')).toBeNull()
	})

	it('invokes onAdd when the add button is clicked', async () => {
		const onAdd = vi.fn()

		renderUI(
			<ArrayField items={rows} getKey={(r) => r.id} onAdd={onAdd} addLabel="Add row">
				{(row) => <span>{row.name}</span>}
			</ArrayField>,
		)

		await userEvent.setup().click(screen.getByRole('button', { name: 'Add row' }))

		expect(onAdd).toHaveBeenCalledTimes(1)
	})

	it('disables the add button when at max', () => {
		renderUI(
			<ArrayField items={rows} getKey={(r) => r.id} onAdd={() => {}} max={3} addLabel="Add">
				{(row) => <span>{row.name}</span>}
			</ArrayField>,
		)

		expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled()
	})

	it('invokes onRemove with the item and index', async () => {
		const onRemove = vi.fn()

		const { container } = renderUI(
			<ArrayField items={rows} getKey={(r) => r.id} onRemove={onRemove}>
				{(row) => <span>{row.name}</span>}
			</ArrayField>,
		)

		const removeButtons = container.querySelectorAll<HTMLButtonElement>(
			'[data-slot="array-field-remove"]',
		)

		await userEvent.setup().click(removeButtons[1] as HTMLButtonElement)

		expect(onRemove).toHaveBeenCalledWith(rows[1], 1)
	})

	it('hides remove buttons when the row count is at min', () => {
		const { container } = renderUI(
			<ArrayField items={rows.slice(0, 1)} getKey={(r) => r.id} onRemove={() => {}} min={1}>
				{(row) => <span>{row.name}</span>}
			</ArrayField>,
		)

		expect(allBySlot(container, 'array-field-remove')).toHaveLength(0)
	})

	it('disables the underlying fieldset when disabled', () => {
		const { container } = renderUI(
			<ArrayField items={rows} getKey={(r) => r.id} disabled>
				{(row) => <span>{row.name}</span>}
			</ArrayField>,
		)

		expect(bySlot(container, 'array-field')).toBeDisabled()
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<ArrayField items={rows} getKey={(r) => r.id} className="custom">
				{(row) => <span>{row.name}</span>}
			</ArrayField>,
		)

		expect(bySlot(container, 'array-field')?.className).toContain('custom')
	})
})
