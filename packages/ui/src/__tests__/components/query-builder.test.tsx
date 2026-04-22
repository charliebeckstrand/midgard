import { describe, expect, it, vi } from 'vitest'
import {
	createGroup,
	createRule,
	QueryBuilder,
	type QueryField,
} from '../../components/query-builder'
import { bySlot, renderUI, screen } from '../helpers'

const fields: QueryField[] = [
	{ name: 'name', label: 'Name', type: 'text' },
	{ name: 'age', label: 'Age', type: 'number' },
]

describe('QueryBuilder', () => {
	it('renders with data-slot="query-builder"', () => {
		const { container } = renderUI(<QueryBuilder fields={fields} />)

		const el = bySlot(container, 'query-builder')

		expect(el).toBeInTheDocument()
	})

	it('renders the root query group', () => {
		const { container } = renderUI(<QueryBuilder fields={fields} />)

		const group = bySlot(container, 'query-group')

		expect(group).toBeInTheDocument()

		expect(group).toHaveAttribute('data-combinator', 'and')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<QueryBuilder fields={fields} className="custom" />)

		const el = bySlot(container, 'query-builder')

		expect(el?.className).toContain('custom')
	})

	it('renders rules from a provided defaultValue', () => {
		const defaultValue = createGroup('and', [createRule(fields[0]), createRule(fields[1])])

		const { container } = renderUI(<QueryBuilder fields={fields} defaultValue={defaultValue} />)

		expect(container.querySelectorAll('[data-slot="query-rule"]')).toHaveLength(2)
	})

	it('shows the empty-state alert when no rules are present', () => {
		const { container } = renderUI(<QueryBuilder fields={fields} />)

		expect(container.querySelectorAll('[data-slot="query-rule"]')).toHaveLength(0)

		expect(screen.getByText('No rules added')).toBeInTheDocument()
	})

	it('calls onChange when a rule is added', () => {
		const onChange = vi.fn()

		renderUI(<QueryBuilder fields={fields} onChange={onChange} />)

		screen.getByRole('button', { name: 'Add rule' }).click()

		expect(onChange).toHaveBeenCalled()
	})

	it('disables the controls when disabled is set', () => {
		renderUI(<QueryBuilder fields={fields} disabled />)

		expect(screen.getByRole('button', { name: 'Add rule' })).toBeDisabled()
	})
})
