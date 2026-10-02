import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { createGroup } from '../../modules/query/engine/query-node'
import type { QueryField, QueryRule } from '../../modules/query/engine/types'
import {
	type QueryBuilderActions,
	QueryBuilderProvider,
	type QueryBuilderStateValue,
} from '../../modules/query/query-builder/context'
import { QueryBuilderRule } from '../../modules/query/query-builder/query-builder-rule'
import { QueryBuilderRuleValue } from '../../modules/query/query-builder/query-builder-rule-value'
import { bySlot, fireEvent, renderUI, screen, setupUser, within } from '../helpers'

const fields: QueryField[] = [
	{ name: 'name', label: 'Name', type: 'text' },
	{ name: 'age', label: 'Age', type: 'number' },
	// A field with no operators: a change to it can give no first operator.
	{ name: 'tag', label: 'Tag', type: 'text', operators: [] },
]

function makeRule(patch: Partial<QueryRule>): QueryRule {
	return {
		id: 'r1',
		type: 'rule',
		combinator: 'and',
		field: 'name',
		operator: 'equals',
		value: '',
		...patch,
	}
}

function makeActions(): QueryBuilderActions {
	return {
		updateRule: vi.fn(),
		updateCombinator: vi.fn(),
		addRule: vi.fn(),
		addGroup: vi.fn(),
		remove: vi.fn(),
		move: vi.fn(),
	}
}

function renderRule(
	rule: QueryRule,
	{
		actions = makeActions(),
		state,
		removable,
	}: {
		actions?: QueryBuilderActions
		state?: Partial<QueryBuilderStateValue>
		removable?: boolean
	} = {},
) {
	const stateValue: QueryBuilderStateValue = {
		fields,
		getField: (name: string) => fields.find((f) => f.name === name),
		disabled: false,
		allowGroups: true,
		hideFieldSelector: false,
		requireRule: false,
		reorderable: false,
		...state,
	}

	function Wrapper({ children }: { children: ReactNode }) {
		return (
			<QueryBuilderProvider
				state={stateValue}
				actions={actions}
				root={createGroup()}
				register={() => {}}
			>
				{children}
			</QueryBuilderProvider>
		)
	}

	const view = renderUI(
		<Wrapper>
			<QueryBuilderRule rule={rule} removable={removable} />
		</Wrapper>,
	)

	return { ...view, actions }
}

/** Opens the named combobox and clicks the option with the given name. */
function pick(combobox: string, option: string) {
	fireEvent.click(screen.getByRole('combobox', { name: combobox }))

	fireEvent.click(screen.getByRole('option', { name: option }))
}

describe('QueryBuilderRule', () => {
	it('resets the operator to the first one of the new field and clears the value on a field change', () => {
		const { actions } = renderRule(makeRule({ value: 'Ada' }))

		pick('Field', 'Age')

		expect(actions.updateRule).toHaveBeenCalledWith('r1', {
			field: 'age',
			operator: 'equals',
			value: '',
		})
	})

	it('sets a blank operator when the new field has no operators', () => {
		const { actions } = renderRule(makeRule({ value: 'Ada' }))

		pick('Field', 'Tag')

		expect(actions.updateRule).toHaveBeenCalledWith('r1', { field: 'tag', operator: '', value: '' })
	})

	it('keeps the value when the operator changes to one of the same arity', () => {
		const { actions } = renderRule(makeRule({ field: 'age', operator: 'equals', value: 5 }))

		pick('Operator', '>')

		expect(actions.updateRule).toHaveBeenCalledWith('r1', { operator: 'gt' })
	})

	it('resets the value to an empty pair when the operator changes to a range', () => {
		const { actions } = renderRule(makeRule({ field: 'age', operator: 'equals', value: 5 }))

		pick('Operator', 'Between')

		expect(actions.updateRule).toHaveBeenCalledWith('r1', { operator: 'between', value: ['', ''] })
	})

	it('resets the value to an empty string when the operator changes from a range', () => {
		const { actions } = renderRule(makeRule({ field: 'age', operator: 'between', value: [1, 9] }))

		pick('Operator', '=')

		expect(actions.updateRule).toHaveBeenCalledWith('r1', { operator: 'equals', value: '' })
	})

	it('reads an unknown current operator as a scalar, so a scalar pick keeps the value', () => {
		const { actions } = renderRule(makeRule({ field: 'age', operator: 'gone', value: 5 }))

		pick('Operator', '<')

		expect(actions.updateRule).toHaveBeenCalledWith('r1', { operator: 'lt' })
	})

	it('writes an edit of the value editor to the rule', () => {
		const { actions } = renderRule(makeRule({ value: '' }))

		fireEvent.change(screen.getByRole('textbox', { name: 'Name value' }), {
			target: { value: 'Ada' },
		})

		expect(actions.updateRule).toHaveBeenCalledWith('r1', { value: 'Ada' })
	})

	it('removes the rule by its id from the remove button', () => {
		const { actions } = renderRule(makeRule({}))

		fireEvent.click(screen.getByRole('button', { name: 'Remove rule' }))

		expect(actions.remove).toHaveBeenCalledWith('r1')
	})

	it('shows the labels of the selected field and operator on the triggers', () => {
		renderRule(makeRule({ field: 'age', operator: 'gte' }))

		expect(screen.getByRole('combobox', { name: 'Field' })).toHaveTextContent('Age')

		expect(screen.getByRole('combobox', { name: 'Operator' })).toHaveTextContent('≥')
	})

	it('shows no value editor and no operators for a field that is not in the list', () => {
		const { container } = renderRule(makeRule({ field: 'gone', operator: 'equals' }))

		expect(screen.queryByRole('textbox')).not.toBeInTheDocument()

		expect(screen.getByRole('combobox', { name: 'Field' })).not.toHaveTextContent('gone')

		fireEvent.click(screen.getByRole('combobox', { name: 'Operator' }))

		expect(screen.queryAllByRole('option')).toHaveLength(0)

		expect(bySlot(container, 'query-rule')).toBeInTheDocument()
	})

	it('shows a pair of bound inputs for a range operator', () => {
		renderRule(makeRule({ field: 'age', operator: 'between', value: [1, 9] }))

		expect(screen.getByRole('spinbutton', { name: 'Age minimum' })).toHaveValue(1)

		expect(screen.getByRole('spinbutton', { name: 'Age maximum' })).toHaveValue(9)
	})
})

describe('QueryBuilderRuleValue', () => {
	const status: QueryField = {
		name: 'status',
		label: 'Status',
		type: 'select',
		options: [
			{ value: 'open', label: 'Open' },
			{ value: 'closed', label: 'Closed' },
		],
	}

	const due: QueryField = { name: 'due', label: 'Due', type: 'date' }

	it('emits the value of the option picked in a select field', () => {
		const onValueChange = vi.fn()

		renderUI(<QueryBuilderRuleValue field={status} value="" onValueChange={onValueChange} />)

		pick('Status value', 'Closed')

		expect(onValueChange).toHaveBeenCalledWith('closed')
	})

	it('shows the label of the selected option on the select trigger', () => {
		renderUI(<QueryBuilderRuleValue field={status} value="open" onValueChange={vi.fn()} />)

		expect(screen.getByRole('combobox', { name: 'Status value' })).toHaveTextContent('Open')
	})

	it('shows the placeholder for a select value that is unset or names no option', () => {
		const { rerender } = renderUI(
			<QueryBuilderRuleValue field={status} value={undefined} onValueChange={vi.fn()} />,
		)

		const trigger = screen.getByRole('combobox', { name: 'Status value' })

		expect(trigger).toHaveTextContent('Value')

		rerender(<QueryBuilderRuleValue field={status} value="gone" onValueChange={vi.fn()} />)

		expect(trigger).not.toHaveTextContent('gone')
	})

	it('emits a number for a number field, and a blank string when cleared', () => {
		const onValueChange = vi.fn()

		const age: QueryField = { name: 'age', label: 'Age', type: 'number' }

		const { rerender } = renderUI(
			<QueryBuilderRuleValue field={age} value="" onValueChange={onValueChange} />,
		)

		const input = screen.getByRole('spinbutton', { name: 'Age value' })

		fireEvent.change(input, { target: { value: '42' } })

		expect(onValueChange).toHaveBeenLastCalledWith(42)

		rerender(<QueryBuilderRuleValue field={age} value={42} onValueChange={onValueChange} />)

		fireEvent.change(input, { target: { value: '' } })

		expect(onValueChange).toHaveBeenLastCalledWith('')
	})

	it('emits a picked date as a local ISO date string', async () => {
		const user = setupUser()

		const onValueChange = vi.fn()

		renderUI(<QueryBuilderRuleValue field={due} value="2025-06-15" onValueChange={onValueChange} />)

		await user.click(screen.getByRole('combobox', { name: /Due value/ }))

		const day = screen.getAllByRole('option').find((b) => b.textContent?.trim() === '20')

		if (!day) throw new Error('day 20 not found')

		await user.click(day)

		expect(onValueChange).toHaveBeenCalledWith('2025-06-20')
	})

	it('shows no date for a value that is not an ISO date', () => {
		renderUI(<QueryBuilderRuleValue field={due} value="not a date" onValueChange={vi.fn()} />)

		expect(screen.getByRole('combobox', { name: /Due value/ })).toHaveTextContent('Value')
	})

	it('shows no date for an empty value, and emits a blank string when the date is cleared', async () => {
		const user = setupUser()

		const onValueChange = vi.fn()

		const { rerender } = renderUI(
			<QueryBuilderRuleValue field={due} value="" onValueChange={onValueChange} />,
		)

		const trigger = screen.getByRole('combobox', { name: /Due value/ })

		expect(trigger).toHaveTextContent('Value')

		rerender(<QueryBuilderRuleValue field={due} value="2025-06-15" onValueChange={onValueChange} />)

		await user.click(trigger)

		const toolbar = screen.getByRole('toolbar', { name: 'Date picker actions' })

		await user.click(within(toolbar).getByRole('button', { name: 'Clear selection' }))

		expect(onValueChange).toHaveBeenCalledWith('')
	})
})

describe('QueryBuilderRuleValue range', () => {
	const age: QueryField = { name: 'age', label: 'Age', type: 'number', span: [18, 65] }

	it('reads a value that is not a pair as two blank bounds', () => {
		const onValueChange = vi.fn()

		renderUI(<QueryBuilderRuleValue field={age} value="30" range onValueChange={onValueChange} />)

		const min = screen.getByRole('spinbutton', { name: 'Age minimum' }) as HTMLInputElement

		const max = screen.getByRole('spinbutton', { name: 'Age maximum' }) as HTMLInputElement

		expect(min.value).toBe('')

		expect(max.value).toBe('')

		fireEvent.change(min, { target: { value: '20' } })

		expect(onValueChange).toHaveBeenCalledWith([20, ''])
	})

	it('emits a blank upper bound when the maximum is cleared', () => {
		const onValueChange = vi.fn()

		renderUI(
			<QueryBuilderRuleValue field={age} value={[20, 40]} range onValueChange={onValueChange} />,
		)

		fireEvent.change(screen.getByRole('spinbutton', { name: 'Age maximum' }), {
			target: { value: '' },
		})

		expect(onValueChange).toHaveBeenCalledWith([20, ''])
	})

	it('clamps the maximum to the span alone when the minimum is not a number', () => {
		renderUI(
			<QueryBuilderRuleValue field={age} value={['abc', 40]} range onValueChange={vi.fn()} />,
		)

		expect(screen.getByRole('spinbutton', { name: 'Age maximum' })).toHaveAttribute('min', '18')
	})
})
