import { type ReactNode, useEffect } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
	createGroup,
	createRule,
	QueryBuilder,
	QueryBuilderRuleValue,
	type QueryField,
	type QueryGroupNode,
} from '../../modules/query-builder'
import { bySlot, fireEvent, renderUI, screen, within } from '../helpers'

// Overrides the shared `motion/react` mock: the pass-through `AnimatePresence`
// never fires `onExitComplete`, blocking the Listbox's deferred-select flush.
// This override makes single-select commits immediate. `onExitComplete` is fired
// from an effect so `flushPending`'s setState lands in the commit phase.
vi.mock('motion/react', async () => {
	const actual =
		await vi.importActual<typeof import('../mocks/motion-react')>('../mocks/motion-react')

	const base = actual.default

	function AnimatePresence({
		children,
		onExitComplete,
	}: {
		children?: ReactNode
		onExitComplete?: () => void
	}) {
		const isEmpty = children == null || children === false

		useEffect(() => {
			if (isEmpty) onExitComplete?.()
		}, [isEmpty, onExitComplete])

		return <>{children}</>
	}

	return { ...base, AnimatePresence }
})

const fields: QueryField[] = [
	{ name: 'name', label: 'Name', type: 'text' },
	{ name: 'age', label: 'Age', type: 'number' },
]

describe('QueryBuilder', () => {
	it('renders the root query group', () => {
		const { container } = renderUI(<QueryBuilder fields={fields} />)

		const group = bySlot(container, 'query-group')

		expect(group).toBeInTheDocument()

		expect(group).toHaveAttribute('data-combinator', 'and')
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

	it('calls onValueChange when a rule is added', () => {
		const onChange = vi.fn()

		renderUI(<QueryBuilder fields={fields} onValueChange={onChange} />)

		fireEvent.click(screen.getByRole('button', { name: 'Add rule' }))

		expect(onChange).toHaveBeenCalled()
	})

	it('disables the controls when disabled is set', () => {
		renderUI(<QueryBuilder fields={fields} disabled />)

		expect(screen.getByRole('button', { name: 'Add rule' })).toBeDisabled()
	})

	it('renders a remove button on each rule that removes the rule when clicked', () => {
		const onChange = vi.fn()

		const initialRule = createRule(fields[0])

		const tree = createGroup('and', [initialRule])

		renderUI(<QueryBuilder fields={fields} value={tree} onValueChange={onChange} />)

		const removeButton = screen.getByRole('button', { name: 'Remove rule' })

		expect(removeButton).toBeInTheDocument()

		fireEvent.click(removeButton)

		expect(onChange).toHaveBeenCalled()

		const next = onChange.mock.calls.at(-1)?.[0]

		expect(next.children).toHaveLength(0)
	})

	it('disables the remove rule button when QueryBuilder is disabled', () => {
		const initialRule = createRule(fields[0])

		const tree = createGroup('and', [initialRule])

		renderUI(<QueryBuilder fields={fields} value={tree} disabled />)

		expect(screen.getByRole('button', { name: 'Remove rule' })).toBeDisabled()
	})

	it('renders a value input for text-typed rule fields', () => {
		const initialRule = createRule(fields[0])

		const tree = createGroup('and', [initialRule])

		const { container } = renderUI(<QueryBuilder fields={fields} value={tree} />)

		const inputs = container.querySelectorAll('input[type="text"]')

		expect(inputs.length).toBeGreaterThan(0)
	})

	// Field- and operator-selector interaction tests are omitted pending a rewrite
	// that drives selectors through a unit-level seam instead of the floating-ui mock.

	it('names the field and operator selectors', () => {
		const tree = createGroup('and', [createRule(fields[0])])

		const { container } = renderUI(<QueryBuilder fields={fields} value={tree} />)

		const labels = Array.from(container.querySelectorAll('[data-slot="listbox-button"]'), (el) =>
			el.getAttribute('aria-label'),
		)

		expect(labels).toContain('Field')

		expect(labels).toContain('Operator')
	})

	it('renders a number input for number-typed rule fields', () => {
		const numberRule = createRule(fields[1])

		const tree = createGroup('and', [numberRule])

		const { container } = renderUI(<QueryBuilder fields={fields} value={tree} />)

		expect(container.querySelector('input[type="number"]')).toBeInTheDocument()
	})

	it('writes the edited text value back into the rule', () => {
		const onChange = vi.fn()

		const tree = createGroup('and', [createRule(fields[0])])

		const { container } = renderUI(
			<QueryBuilder fields={fields} defaultValue={tree} onValueChange={onChange} />,
		)

		const input = container.querySelector('input[type="text"]') as HTMLInputElement

		fireEvent.change(input, { target: { value: 'Ada' } })

		const next = onChange.mock.calls.at(-1)?.[0] as QueryGroupNode

		expect(next.children[0]).toMatchObject({ type: 'rule', value: 'Ada' })
	})

	it('coerces number rule values and clears them to an empty string', () => {
		const onChange = vi.fn()

		const tree = createGroup('and', [createRule(fields[1])])

		const { container } = renderUI(
			<QueryBuilder fields={fields} defaultValue={tree} onValueChange={onChange} />,
		)

		const input = container.querySelector('input[type="number"]') as HTMLInputElement

		fireEvent.change(input, { target: { value: '42' } })

		expect((onChange.mock.calls.at(-1)?.[0] as QueryGroupNode).children[0]).toMatchObject({
			value: 42,
		})

		fireEvent.change(input, { target: { value: '' } })

		expect((onChange.mock.calls.at(-1)?.[0] as QueryGroupNode).children[0]).toMatchObject({
			value: '',
		})
	})

	it('renders a Select for select-typed rule fields', () => {
		const selectField: QueryField = {
			name: 'status',
			label: 'Status',
			type: 'select',
			options: [
				{ value: 'open', label: 'Open' },
				{ value: 'closed', label: 'Closed' },
			],
		}

		const rule = createRule(selectField)

		const tree = createGroup('and', [rule])

		const { container } = renderUI(<QueryBuilder fields={[selectField]} value={tree} />)

		// Field selector + operator selector + value selector: 3 listbox buttons total.
		expect(container.querySelectorAll('[data-slot="listbox-button"]')).toHaveLength(3)
	})

	it('omits the value control when the selected operator has noValue=true', () => {
		const textField: QueryField = { name: 'name', label: 'Name', type: 'text' }

		const rule = {
			...createRule(textField),
			operator: 'isEmpty',
		}

		const tree = createGroup('and', [rule])

		const { container } = renderUI(<QueryBuilder fields={[textField]} value={tree} />)

		// Only the two selects (field, operator) are present; no value input.
		expect(container.querySelector('input[type="text"]')).not.toBeInTheDocument()

		expect(container.querySelectorAll('[data-slot="listbox-button"]')).toHaveLength(2)
	})
})

describe('QueryBuilderGroup', () => {
	it('adds a rule to the root group when "Add rule" is clicked', () => {
		const onChange = vi.fn()

		renderUI(<QueryBuilder fields={fields} onValueChange={onChange} />)

		fireEvent.click(screen.getByRole('button', { name: 'Add rule' }))

		const next = onChange.mock.calls.at(-1)?.[0]

		expect(next.children).toHaveLength(1)

		expect(next.children[0].type).toBe('rule')
	})

	it('adds a nested group when "Add group" is clicked on the root', () => {
		const onChange = vi.fn()

		renderUI(<QueryBuilder fields={fields} onValueChange={onChange} />)

		fireEvent.click(screen.getByRole('button', { name: 'Add group' }))

		const next = onChange.mock.calls.at(-1)?.[0]

		expect(next.children).toHaveLength(1)

		expect(next.children[0].type).toBe('group')
	})

	it('shows "Add group" but no "Remove group" at the root', () => {
		renderUI(<QueryBuilder fields={fields} />)

		// Root renders "Add group" but never "Remove group".
		expect(screen.queryByRole('button', { name: 'Remove group' })).not.toBeInTheDocument()
	})

	it('renders the AND/OR combinator between sibling children', () => {
		const tree = createGroup('and', [createRule(fields[0]), createRule(fields[0])])

		const { container } = renderUI(<QueryBuilder fields={fields} value={tree} />)

		// Segment renders for the second child only.
		const segments = container.querySelectorAll('[data-slot="segment"]')

		expect(segments.length).toBeGreaterThan(0)
	})

	it('switches the child combinator when an AND/OR segment is clicked', () => {
		const onChange = vi.fn()

		const tree = createGroup('and', [createRule(fields[0]), createRule(fields[0])])

		renderUI(<QueryBuilder fields={fields} value={tree} onValueChange={onChange} />)

		// Click the OR option on the segment between the two rules.
		fireEvent.click(screen.getByRole('tab', { name: 'OR' }))

		const next = onChange.mock.calls.at(-1)?.[0]

		expect(next.children[1].combinator).toBe('or')
	})

	it('renders a nested group with its own remove control', () => {
		const inner = createGroup('and', [createRule(fields[0])])

		const tree = createGroup('and', [inner])

		renderUI(<QueryBuilder fields={fields} value={tree} />)

		expect(screen.getByRole('button', { name: 'Remove group' })).toBeInTheDocument()
	})

	it('adds a sub-group from a nested group (arbitrary depth)', () => {
		const onChange = vi.fn()

		const inner = createGroup('and', [createRule(fields[0])])

		const tree = createGroup('and', [inner])

		const { container } = renderUI(
			<QueryBuilder fields={fields} value={tree} onValueChange={onChange} />,
		)

		const groups = container.querySelectorAll<HTMLElement>('[data-slot="query-group"]')

		// Root plus the one nested group; each group renders its own "Add group" button.
		expect(groups).toHaveLength(2)

		const nested = groups[1]

		if (!nested) throw new Error('expected a nested query-group')

		fireEvent.click(within(nested).getByRole('button', { name: 'Add group' }))

		const next = onChange.mock.calls.at(-1)?.[0]

		// The inner group gained a child group → depth-2 nesting.
		expect(next.children[0].children.at(-1).type).toBe('group')
	})
})

describe('QueryBuilderRuleValue', () => {
	it('renders a text Input for text fields and emits string changes', () => {
		const field: QueryField = { name: 'name', label: 'Name', type: 'text' }

		const onChange = vi.fn()

		const { container } = renderUI(
			<QueryBuilderRuleValue field={field} value="hi" onValueChange={onChange} />,
		)

		const input = container.querySelector('input') as HTMLInputElement

		expect(input).toHaveAttribute('type', 'text')

		expect(input).toHaveAttribute('aria-label', 'Name value')

		expect(input.value).toBe('hi')

		fireEvent.change(input, { target: { value: 'bye' } })

		expect(onChange).toHaveBeenCalledWith('bye')
	})

	it('renders a number Input and emits numeric changes', () => {
		const field: QueryField = { name: 'age', label: 'Age', type: 'number' }

		const onChange = vi.fn()

		const { container } = renderUI(
			<QueryBuilderRuleValue field={field} value={10} onValueChange={onChange} />,
		)

		const input = container.querySelector('input') as HTMLInputElement

		expect(input).toHaveAttribute('type', 'number')

		expect(input.value).toBe('10')

		fireEvent.change(input, { target: { value: '42' } })

		expect(onChange).toHaveBeenCalledWith(42)
	})

	it('emits empty string for empty numeric input', () => {
		const field: QueryField = { name: 'age', label: 'Age', type: 'number' }

		const onChange = vi.fn()

		const { container } = renderUI(
			<QueryBuilderRuleValue field={field} value={3} onValueChange={onChange} />,
		)

		const input = container.querySelector('input') as HTMLInputElement

		fireEvent.change(input, { target: { value: '' } })

		expect(onChange).toHaveBeenCalledWith('')
	})

	it('renders empty number input when value is null', () => {
		const field: QueryField = { name: 'age', label: 'Age', type: 'number' }

		const { container } = renderUI(
			<QueryBuilderRuleValue field={field} value={null} onValueChange={() => {}} />,
		)

		const input = container.querySelector('input') as HTMLInputElement

		expect(input.value).toBe('')
	})

	it('renders a Select for select fields', () => {
		const field: QueryField = {
			name: 'status',
			label: 'Status',
			type: 'select',
			options: [
				{ value: 'open', label: 'Open' },
				{ value: 'closed', label: 'Closed' },
			],
		}

		const { container } = renderUI(
			<QueryBuilderRuleValue field={field} value="open" onValueChange={() => {}} />,
		)

		const button = container.querySelector('button[aria-haspopup="listbox"]')

		expect(button).toBeInTheDocument()
	})

	it('does not render a text input for date fields', () => {
		const field: QueryField = { name: 'start', label: 'Start', type: 'date' }

		const { container } = renderUI(
			<QueryBuilderRuleValue field={field} value="2024-03-05" onValueChange={() => {}} />,
		)

		const textInput = container.querySelector('input[type="text"]')

		expect(textInput).not.toBeInTheDocument()
	})

	it('names the date picker by the rule field label', () => {
		const field: QueryField = { name: 'start', label: 'Start', type: 'date' }

		renderUI(<QueryBuilderRuleValue field={field} value="2024-03-05" onValueChange={() => {}} />)

		// The select/number/text branches name their controls "<label> value";
		// the date branch threads the same name through DatePicker's aria-label.
		expect(screen.getByRole('button', { name: 'Start value' })).toBeInTheDocument()
	})

	// Regression: the bare `Date(year, month, day)` constructor maps years 0–99
	// to 1900–1999. A stored `0001-01-01` reached the DatePicker as 1901.
	it('parses an ISO date below year 100 without mapping it to 19xx', () => {
		const field: QueryField = { name: 'start', label: 'Start', type: 'date' }

		renderUI(<QueryBuilderRuleValue field={field} value="0001-01-01" onValueChange={() => {}} />)

		const yearOne = new Date(2000, 0, 1)

		yearOne.setFullYear(1)

		const trigger = screen.getByRole('button', { name: 'Start value' })

		// The trigger repeats the date in its truncation tooltip, so assert
		// containment rather than the full text.
		expect(trigger.textContent).toContain(yearOne.toLocaleDateString())

		expect(trigger.textContent).not.toContain('1901')
	})

	it('falls back to a text input for unknown field types', () => {
		const field: QueryField = { name: 'x', label: 'X', type: 'boolean' }

		const { container } = renderUI(
			<QueryBuilderRuleValue field={field} value={undefined} onValueChange={() => {}} />,
		)

		const input = container.querySelector('input') as HTMLInputElement

		expect(input).toHaveAttribute('type', 'text')

		expect(input.value).toBe('')
	})
})

// Removing a rule unmounts its remove button; without focus management that
// drops focus to <body> (WCAG 2.4.3). Focus follows the APG list pattern:
// previous sibling, else next, else the group's "Add rule" control.
describe('QueryBuilder removal focus', () => {
	const removeButtons = () => screen.getAllByRole('button', { name: 'Remove rule' })

	it('moves focus to the previous rule after removing a middle/last rule', () => {
		const tree = createGroup('and', [createRule(fields[0]), createRule(fields[1])])

		renderUI(<QueryBuilder fields={fields} defaultValue={tree} />)

		const [first, second] = removeButtons()

		fireEvent.click(second as HTMLElement)

		expect(removeButtons()).toHaveLength(1)

		expect(document.activeElement).toBe(first)
	})

	it('moves focus to the next rule after removing the first rule', () => {
		const tree = createGroup('and', [createRule(fields[0]), createRule(fields[1])])

		renderUI(<QueryBuilder fields={fields} defaultValue={tree} />)

		const [first, second] = removeButtons()

		fireEvent.click(first as HTMLElement)

		expect(removeButtons()).toHaveLength(1)

		expect(document.activeElement).toBe(second)
	})

	it("moves focus to the group's Add rule control after removing the only rule", () => {
		const tree = createGroup('and', [createRule(fields[0])])

		renderUI(<QueryBuilder fields={fields} defaultValue={tree} />)

		fireEvent.click(removeButtons()[0] as HTMLElement)

		expect(screen.queryAllByRole('button', { name: 'Remove rule' })).toHaveLength(0)

		expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Add rule' }))
	})
})
