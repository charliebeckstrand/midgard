import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ControlLockContext } from '../../components/control/context'
import {
	createGroup,
	QueryBuilder,
	type QueryField,
	type QueryGroup,
	type QueryRule,
	type QueryValueEditorProps,
	QueryValueEditorProvider,
	setOperators,
} from '../../modules/query'
import { fireEvent, renderUI, screen } from '../helpers'

const names: Record<string, string> = { c1: 'Acme', c2: 'Globex' }

const customer: QueryField = {
	name: 'customer',
	label: 'Customer',
	type: 'select',
	editor: 'customer',
	operators: [...setOperators, { value: 'equals', label: 'is' }],
	formatValue: (value) => names[value],
}

const tags: QueryField = { name: 'tags', label: 'Tags', type: 'text', operators: [...setOperators] }

const amount: QueryField = {
	name: 'amount',
	label: 'Amount',
	type: 'number',
	operators: [...setOperators],
}

const fields = [customer, tags, amount]

const props = vi.fn<(props: QueryValueEditorProps) => void>()

/** An editor that adds one key to a set, or writes one key, on a press. */
function CustomerEditor(editor: QueryValueEditorProps) {
	props(editor)

	const set = Array.isArray(editor.value) ? editor.value : []

	return (
		<button
			type="button"
			aria-label={editor['aria-label']}
			disabled={editor.disabled}
			onClick={() => {
				if (editor.readOnly) return

				editor.onValueChange(editor.operator.set ? [...set, 'c2'] : 'c2')
			}}
		>
			{set.length}
		</button>
	)
}

const editors = { customer: CustomerEditor }

function rule(patch: Partial<QueryRule>): QueryRule {
	return { id: 'r1', type: 'rule', field: 'customer', operator: 'in', value: ['c1'], ...patch }
}

/** A controlled builder, so an edit lands in the tree that the test reads. */
function Harness({
	start,
	onChange,
}: {
	start: QueryGroup
	onChange?: (value: QueryGroup) => void
}) {
	const [value, setValue] = useState(start)

	return (
		<QueryBuilder
			fields={fields}
			value={value}
			onValueChange={(next) => {
				setValue(next)

				onChange?.(next)
			}}
		/>
	)
}

describe('a custom value editor', () => {
	it('renders the editor of the field key, with the operator, the value, and the name', () => {
		props.mockClear()

		renderUI(
			<QueryValueEditorProvider editors={editors}>
				<Harness start={createGroup('and', [rule({})])} />
			</QueryValueEditorProvider>,
		)

		expect(screen.getByRole('button', { name: 'Customer value' })).toHaveTextContent('1')

		expect(props).toHaveBeenLastCalledWith(
			expect.objectContaining({
				field: customer,
				operator: expect.objectContaining({ value: 'in', set: true }),
				value: ['c1'],
				disabled: false,
				readOnly: false,
			}),
		)
	})

	it('writes the value that the editor gives to the rule', () => {
		const onChange = vi.fn()

		renderUI(
			<QueryValueEditorProvider editors={editors}>
				<Harness start={createGroup('and', [rule({})])} onChange={onChange} />
			</QueryValueEditorProvider>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'Customer value' }))

		expect(onChange.mock.lastCall?.[0].children[0]).toMatchObject({ value: ['c1', 'c2'] })
	})

	it('names the rule group by the labels of formatValue', () => {
		renderUI(
			<QueryValueEditorProvider editors={editors}>
				<Harness start={createGroup('and', [rule({ value: ['c1', 'c2'] })])} />
			</QueryValueEditorProvider>,
		)

		expect(
			screen.getByRole('group', { name: 'Customer is any of Acme or Globex' }),
		).toBeInTheDocument()
	})

	it('gives the lock of the nearest lock scope as readOnly, and the disabled state', () => {
		props.mockClear()

		const { rerender } = renderUI(
			<ControlLockContext value>
				<QueryValueEditorProvider editors={editors}>
					<QueryBuilder fields={fields} value={createGroup('and', [rule({})])} />
				</QueryValueEditorProvider>
			</ControlLockContext>,
		)

		expect(props).toHaveBeenLastCalledWith(expect.objectContaining({ readOnly: true }))

		rerender(
			<QueryValueEditorProvider editors={editors}>
				<QueryBuilder fields={fields} value={createGroup('and', [rule({})])} disabled />
			</QueryValueEditorProvider>,
		)

		expect(props).toHaveBeenLastCalledWith(
			expect.objectContaining({ readOnly: false, disabled: true }),
		)
	})

	it('falls back to the input of the operator when no provider holds the key', () => {
		renderUI(<Harness start={createGroup('and', [rule({})])} />)

		expect(screen.queryByRole('button', { name: 'Customer value' })).toBeNull()

		expect(screen.getByRole('textbox', { name: 'Customer value' })).toBeInTheDocument()
	})

	it('merges a nested provider into the outer one, and the inner editor wins', () => {
		function Inner(editor: QueryValueEditorProps) {
			return <output aria-label={editor['aria-label']}>inner</output>
		}

		renderUI(
			<QueryValueEditorProvider editors={editors}>
				<QueryValueEditorProvider editors={{ customer: Inner }}>
					<Harness start={createGroup('and', [rule({})])} />
				</QueryValueEditorProvider>
			</QueryValueEditorProvider>,
		)

		expect(screen.getByRole('status', { name: 'Customer value' })).toHaveTextContent('inner')
	})
})

describe('a set operator with no custom editor', () => {
	it('edits the set with a tag input', () => {
		const onChange = vi.fn()

		renderUI(
			<Harness
				start={createGroup('and', [rule({ field: 'tags', value: ['urgent'] })])}
				onChange={onChange}
			/>,
		)

		const input = screen.getByRole('textbox', { name: 'Tags value' })

		fireEvent.change(input, { target: { value: 'cold' } })

		fireEvent.keyDown(input, { key: 'Enter' })

		expect(onChange.mock.lastCall?.[0].children[0]).toMatchObject({ value: ['urgent', 'cold'] })
	})

	it('writes each member of a number field as a number, and refuses a tag that is not one', () => {
		const onChange = vi.fn()

		renderUI(
			<Harness
				start={createGroup('and', [rule({ field: 'amount', value: [1234.5] })])}
				onChange={onChange}
			/>,
		)

		const input = screen.getByRole('textbox', { name: 'Amount value' })

		fireEvent.change(input, { target: { value: 'abc' } })

		fireEvent.keyDown(input, { key: 'Enter' })

		expect(onChange).not.toHaveBeenCalled()

		fireEvent.change(input, { target: { value: '$2000' } })

		fireEvent.keyDown(input, { key: 'Enter' })

		expect(onChange.mock.lastCall?.[0].children[0]).toMatchObject({ value: [1234.5, 2000] })
	})
})

describe('an operator change', () => {
	it('resets the value to the blank value of the new shape', () => {
		const onChange = vi.fn()

		renderUI(
			<QueryValueEditorProvider editors={editors}>
				<Harness start={createGroup('and', [rule({})])} onChange={onChange} />
			</QueryValueEditorProvider>,
		)

		fireEvent.click(screen.getByRole('combobox', { name: 'Operator' }))

		fireEvent.click(screen.getByRole('option', { name: 'Is' }))

		expect(onChange.mock.lastCall?.[0].children[0]).toMatchObject({ operator: 'equals', value: '' })
	})

	it('keeps the value for an operator of the same shape', () => {
		const onChange = vi.fn()

		renderUI(
			<QueryValueEditorProvider editors={editors}>
				<Harness start={createGroup('and', [rule({})])} onChange={onChange} />
			</QueryValueEditorProvider>,
		)

		fireEvent.click(screen.getByRole('combobox', { name: 'Operator' }))

		fireEvent.click(screen.getByRole('option', { name: 'Is none of' }))

		expect(onChange.mock.lastCall?.[0].children[0]).toMatchObject({
			operator: 'notIn',
			value: ['c1'],
		})
	})
})
