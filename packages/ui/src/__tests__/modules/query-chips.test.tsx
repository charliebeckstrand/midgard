import { describe, expect, it, vi } from 'vitest'
import { createGroup, createRule } from '../../modules/query/engine/query-node'
import type { QueryField, QueryGroup, QueryNode } from '../../modules/query/engine/types'
import { QueryChips } from '../../modules/query/query-chips'
import { allBySlot, bySlot, expectAnnouncement, fireEvent, renderUI, screen } from '../helpers'

const fields: QueryField[] = [
	{ name: 'name', label: 'Name', type: 'text' },
	{ name: 'age', label: 'Age', type: 'number' },
	{
		name: 'status',
		label: 'Status',
		type: 'select',
		options: [{ value: 'active', label: 'Active' }],
	},
]

const [nameField, ageField, statusField] = fields as [QueryField, QueryField, QueryField]

const name = createRule(nameField)

const nameRule = (value: string, combinator: 'and' | 'or' = 'and') => ({
	...createRule(nameField, combinator),
	operator: 'contains',
	value,
})

const ageRule = (value: number, combinator: 'and' | 'or' = 'and') => ({
	...createRule(ageField, combinator),
	operator: 'gt',
	value,
})

const statusRule = () => ({ ...createRule(statusField), operator: 'equals', value: 'active' })

const tree = (...children: QueryNode[]) => createGroup('and', children)

const removeButton = (text: string) => screen.getByRole('button', { name: `Remove ${text}` })

describe('QueryChips', () => {
	it('renders each active rule as a chip in a named toolbar', () => {
		renderUI(<QueryChips fields={fields} defaultValue={tree(statusRule(), ageRule(30, 'or'))} />)

		const row = screen.getByRole('toolbar', { name: 'Filters' })

		expect(row).toHaveAttribute('data-slot', 'query-chips')

		expect(allBySlot(row, 'query-chip').map((chip) => chip.textContent)).toEqual([
			'Status is Active',
			'Age > 30',
		])

		expect(screen.getByRole('button', { name: 'OR, switch to AND' })).toBeInTheDocument()
	})

	it('gives a blank rule no chip', () => {
		const { container } = renderUI(
			<QueryChips fields={fields} defaultValue={tree(statusRule(), { ...name, value: '' })} />,
		)

		expect(allBySlot(container, 'query-chip')).toHaveLength(1)
	})

	it('describes the row with the full sentence, brackets included', () => {
		renderUI(
			<QueryChips
				fields={fields}
				defaultValue={tree(nameRule('lee'), createGroup('or', [ageRule(30)]))}
			/>,
		)

		expect(screen.getByRole('toolbar')).toHaveAccessibleDescription(
			'Name contains lee OR (Age > 30)',
		)
	})

	it('removes a rule from the tree when its remove button is clicked', async () => {
		const onValueChange = vi.fn()

		const status = statusRule()

		const age = ageRule(30)

		renderUI(<QueryChips fields={fields} value={tree(status, age)} onValueChange={onValueChange} />)

		fireEvent.click(removeButton('Status is Active'))

		const next: QueryGroup = onValueChange.mock.calls.at(-1)?.[0]

		expect(next.children.map((child) => child.id)).toEqual([age.id])

		await expectAnnouncement('Removed Status is Active')
	})

	it('removes a rule on Delete or Backspace at its remove button', () => {
		renderUI(<QueryChips fields={fields} defaultValue={tree(statusRule(), ageRule(30))} />)

		fireEvent.keyDown(removeButton('Status is Active'), { key: 'Delete' })

		fireEvent.keyDown(removeButton('Age > 30'), { key: 'Backspace' })

		expect(screen.queryAllByRole('button', { name: /^Remove/ })).toHaveLength(0)
	})

	it('moves focus to the previous chip after a removal', () => {
		renderUI(<QueryChips fields={fields} defaultValue={tree(statusRule(), ageRule(30))} />)

		fireEvent.click(removeButton('Age > 30'))

		expect(document.activeElement).toBe(removeButton('Status is Active'))
	})

	it('moves focus to the next chip after the first chip goes', () => {
		renderUI(<QueryChips fields={fields} defaultValue={tree(statusRule(), ageRule(30))} />)

		fireEvent.click(removeButton('Status is Active'))

		expect(document.activeElement).toBe(removeButton('Age > 30'))
	})

	it('moves focus to the row, which shows its empty text, after the last chip goes', () => {
		renderUI(<QueryChips fields={fields} defaultValue={tree(statusRule())} />)

		fireEvent.click(removeButton('Status is Active'))

		const row = screen.getByRole('toolbar', { name: 'Filters' })

		expect(document.activeElement).toBe(row)

		expect(row).toHaveTextContent('No filters')

		expect(row).toHaveAttribute('data-empty')
	})

	it('shows the empty text, and holds no Tab stop, when no rule puts a constraint', () => {
		renderUI(<QueryChips fields={fields} emptyLabel="Nothing set" />)

		const row = screen.getByRole('toolbar', { name: 'Filters' })

		expect(row).toHaveTextContent('Nothing set')

		expect(row).toHaveAttribute('tabindex', '-1')
	})

	it('switches a combinator between AND and OR, and keeps focus on it', async () => {
		const onValueChange = vi.fn()

		const age = ageRule(30)

		renderUI(
			<QueryChips
				fields={fields}
				defaultValue={tree(statusRule(), age)}
				onValueChange={onValueChange}
			/>,
		)

		const combinator = screen.getByRole('button', { name: 'AND, switch to OR' })

		combinator.focus()

		fireEvent.click(combinator)

		const next: QueryGroup = onValueChange.mock.calls.at(-1)?.[0]

		expect(next.children.find((child) => child.id === age.id)?.combinator).toBe('or')

		expect(document.activeElement).toBe(combinator)

		expect(combinator).toHaveAccessibleName('OR, switch to AND')

		await expectAnnouncement('Changed AND to OR')
	})

	it('roves across its controls with the arrow keys, as one Tab stop', () => {
		renderUI(<QueryChips fields={fields} defaultValue={tree(statusRule(), ageRule(30))} />)

		const first = removeButton('Status is Active')

		const combinator = screen.getByRole('button', { name: 'AND, switch to OR' })

		expect(first.tabIndex).toBe(0)

		expect(combinator.tabIndex).toBe(-1)

		first.focus()

		fireEvent.keyDown(first, { key: 'ArrowRight' })

		expect(document.activeElement).toBe(combinator)

		fireEvent.keyDown(combinator, { key: 'End' })

		expect(document.activeElement).toBe(removeButton('Age > 30'))
	})

	it('disables each control when disabled', () => {
		renderUI(<QueryChips fields={fields} defaultValue={tree(statusRule(), ageRule(30))} disabled />)

		for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled()
	})

	it('renders the chips as text when read-only', () => {
		const { container } = renderUI(
			<QueryChips fields={fields} defaultValue={tree(statusRule(), ageRule(30, 'or'))} readOnly />,
		)

		const row = bySlot(container, 'query-chips')

		expect(row).toHaveAttribute('role', 'group')

		expect(row).toHaveTextContent('Status is Active OR Age > 30')

		expect(screen.queryAllByRole('button')).toHaveLength(0)
	})

	it('renders nothing when read-only and no rule puts a constraint', () => {
		const { container } = renderUI(
			<QueryChips fields={fields} defaultValue={tree({ ...name, value: '' })} readOnly />,
		)

		expect(bySlot(container, 'query-chips')).toBeNull()
	})
})
