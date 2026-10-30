import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from '../../components/button'
import { Checkbox } from '../../components/checkbox'
import { Label } from '../../components/fieldset'
import { Input } from '../../components/input'
import { Radio } from '../../components/radio'
import { SearchInput } from '../../components/search-input'
import { Switch } from '../../components/switch'
import { Textarea } from '../../components/textarea'
import {
	Form,
	FormFilters,
	FormFiltersBar,
	FormFiltersClear,
	FormFiltersField,
	type FormFiltersFieldProps,
	type FormFiltersFieldRenderProps,
	FormFiltersPrefix,
	FormFiltersRow,
	FormFiltersSuffix,
	useFormFilters,
} from '../../modules/form'
import { useFormActions, useFormResets } from '../../primitives/form/context'
import { useFormValue } from '../../primitives/form/use-form-value'
import {
	allBySlot,
	bySlot,
	expectAnnouncement,
	flushAnnouncer,
	getSlot,
	liveRegion,
	renderUI,
	screen,
	setupUser,
} from '../helpers'

/** A value-shaped control that binds a field by `name`, as the library controls do. */
function Toggle({
	name,
	onValueChange,
}: {
	name?: string
	onValueChange?: (value: boolean | null) => void
}) {
	const { setValue } = useFormValue<boolean>(name, { onValueChange })

	return (
		<button type="button" onClick={() => setValue(true)}>
			Toggle
		</button>
	)
}

/**
 * Renders a controlled bar that holds one field. Gives the render result, the
 * `onValueChange` spy of the bar, and `rerenderValue`, which renders the same
 * bar with another value.
 */
function renderField<V = unknown>(
	name: string,
	control: FormFiltersFieldProps<V>['children'],
	value: Record<string, unknown> = {},
) {
	const onValueChange = vi.fn()

	const bar = (next: Record<string, unknown>) => (
		<FormFilters aria-label="Filters" value={next} onValueChange={onValueChange}>
			<FormFiltersField<V> name={name}>{control}</FormFiltersField>
		</FormFilters>
	)

	const view = renderUI(bar(value))

	return {
		...view,
		onValueChange,
		rerenderValue: (next: Record<string, unknown>) => view.rerender(bar(next)),
	}
}

/** Shows the `activeCount` of the enclosing bar. */
function ActiveCount(): ReactNode {
	const { activeCount } = useFormFilters()

	return <span data-slot="count">{activeCount}</span>
}

describe('FormFilters group', () => {
	it('exposes the bar as a named role="group"', () => {
		renderUI(
			<FormFilters aria-label="Order filters">
				<FormFiltersField name="name">
					<Input />
				</FormFiltersField>
			</FormFilters>,
		)

		expect(screen.getByRole('group', { name: 'Order filters' })).toBeInTheDocument()
	})
})

describe('FormFiltersField', () => {
	it('binds the slot to the control by name', () => {
		const { container } = renderField('name', <Input />, { name: 'hello' })

		const input = getSlot<HTMLInputElement>(container, 'input')

		expect(input.value).toBe('hello')
	})

	it('drives a Checkbox via checked, reflecting the boolean slot', async () => {
		const { container, onValueChange, rerenderValue } = renderField('done', <Checkbox />, {
			done: true,
		})

		const checkbox = getSlot<HTMLInputElement>(container, 'checkbox')

		// A toggle reads `checked`, not `value`; without it the control never
		// reflects the filter state.
		expect(checkbox.checked).toBe(true)

		rerenderValue({})

		expect(checkbox.checked).toBe(false)

		const user = setupUser()

		await user.click(checkbox)

		expect(onValueChange).toHaveBeenCalledWith({ done: true })
	})

	it('binds a Radio group through the render function', async () => {
		const onValueChange = vi.fn()

		const { container, rerender } = renderUI(
			<FormFilters aria-label="Filters" value={{ rating: 3 }} onValueChange={onValueChange}>
				<FormFiltersField<number> name="rating">
					{({ value, onValueChange: set }) =>
						[3, 4].map((option) => (
							<Radio
								key={option}
								name="rating"
								value={option}
								checked={value === option}
								onChange={() => set(option)}
							/>
						))
					}
				</FormFiltersField>
			</FormFilters>,
		)

		const radios = allBySlot(container, 'radio') as HTMLInputElement[]

		expect(radios[0]?.checked).toBe(true)

		await setupUser().click(radios[1] as HTMLInputElement)

		// The slot holds the option value, not the string of the DOM.
		expect(onValueChange).toHaveBeenCalledWith({ rating: 4 })

		rerender(
			<FormFilters aria-label="Filters" value={{}} onValueChange={onValueChange}>
				<FormFiltersField<number> name="rating">
					{({ value }) => <Radio name="rating" value={3} checked={value === 3} readOnly />}
				</FormFiltersField>
			</FormFilters>,
		)

		expect(getSlot<HTMLInputElement>(container, 'radio').checked).toBe(false)
	})

	it('runs the own handlers of the child beside the binding', async () => {
		const onChange = vi.fn()

		const onClear = vi.fn()

		const { container, onValueChange } = renderField(
			'q',
			<SearchInput onChange={onChange} onClear={onClear} />,
			{ q: 'a' },
		)

		const user = setupUser()

		await user.clear(getSlot<HTMLInputElement>(container, 'search-input'))

		expect(onChange).toHaveBeenCalled()

		expect(onClear).toHaveBeenCalled()

		expect(onValueChange).toHaveBeenCalledWith({})
	})

	it('binds a control built on the Form field hooks', async () => {
		const own = vi.fn()

		const { onValueChange } = renderField('done', <Toggle onValueChange={own} />)

		await setupUser().click(screen.getByRole('button', { name: 'Toggle' }))

		expect(own).toHaveBeenCalledWith(true)

		expect(onValueChange).toHaveBeenCalledWith({ done: true })
	})

	it('drives a Switch via checked, reflecting the boolean slot', async () => {
		const { container, onValueChange } = renderField('on', <Switch />)

		const toggle = getSlot<HTMLInputElement>(container, 'switch')

		expect(toggle.checked).toBe(false)

		await setupUser().click(toggle)

		expect(onValueChange).toHaveBeenCalledWith({ on: true })
	})

	it('binds a Textarea through onChange', async () => {
		const { container, onValueChange } = renderField('note', <Textarea />, { note: 'a' })

		const textarea = getSlot<HTMLTextAreaElement>(container, 'textarea')

		expect(textarea.value).toBe('a')

		await setupUser().type(textarea, 'b')

		expect(onValueChange).toHaveBeenCalledWith({ note: 'ab' })
	})

	it('clears the slot from the SearchInput clear button', async () => {
		const { onValueChange } = renderField('q', <SearchInput />, { q: 'a' })

		await setupUser().click(screen.getByRole('button', { name: 'Clear search' }))

		expect(onValueChange).toHaveBeenCalledWith({})
	})

	it('supports render prop children', async () => {
		const { container, onValueChange } = renderField<string>(
			'name',
			({ value, onValueChange: fieldOnValueChange }) => (
				<input
					data-slot="raw-input"
					value={value ?? ''}
					onChange={(event) => fieldOnValueChange(event.target.value)}
				/>
			),
			{ name: '' },
		)

		const input = getSlot<HTMLInputElement>(container, 'raw-input')

		const user = setupUser()

		await user.type(input, 'b')

		expect(onValueChange).toHaveBeenCalledWith(expect.objectContaining({ name: 'b' }))
	})

	// The element form gives the slot `name` to its control, so a wrapper binds
	// when it passes `name` on, and binds nothing when it drops it.
	it('binds a wrapper that passes name to its control', async () => {
		function WrappedInput({ name }: { name?: string }) {
			return <Input name={name} />
		}

		const { container, onValueChange } = renderField('name', <WrappedInput />, { name: '' })

		await setupUser().type(getSlot<HTMLInputElement>(container, 'input'), 'b')

		expect(onValueChange).toHaveBeenCalledWith({ name: 'b' })
	})

	it('leaves a wrapper that drops name unbound', async () => {
		function WrappedInput() {
			return <Input />
		}

		const { container, onValueChange } = renderField('name', <WrappedInput />, { name: '' })

		const input = getSlot<HTMLInputElement>(container, 'input')

		await setupUser().type(input, 'b')

		// The control took the text, so the field rendered it and never bound it.
		expect(input.value).toBe('b')

		expect(onValueChange).not.toHaveBeenCalled()
	})

	it('lets the own value of a control win over the slot', () => {
		const { container } = renderField('name', <Input value="own" onChange={() => {}} />, {
			name: 'slot',
		})

		expect(getSlot<HTMLInputElement>(container, 'input').value).toBe('own')
	})

	it('keeps the fields of a bar inside a Form out of the Form', async () => {
		const onSubmit = vi.fn()

		const onValueChange = vi.fn()

		const { container } = renderUI(
			<Form defaultValues={{ q: 'form' }} onSubmit={onSubmit}>
				<Input name="q" />
				<FormFilters aria-label="Filters" value={{}} onValueChange={onValueChange}>
					<FormFiltersField name="q">
						<Input />
					</FormFiltersField>
				</FormFilters>
			</Form>,
		)

		const inputs = allBySlot(container, 'input') as HTMLInputElement[]

		await setupUser().type(inputs[1] as HTMLInputElement, 'b')

		expect(onValueChange).toHaveBeenCalledWith({ q: 'b' })

		expect(inputs[0]?.value).toBe('form')
	})

	it('lets a wrapped decoration take the control slot', async () => {
		const onChange = vi.fn()

		function WrappedLabel() {
			return <Label>Name</Label>
		}

		const { container } = renderUI(
			<FormFilters aria-label="Filters" value={{ name: '' }} onValueChange={onChange}>
				<FormFiltersField name="name">
					<WrappedLabel />
					<Input />
				</FormFiltersField>
			</FormFilters>,
		)

		const input = getSlot<HTMLInputElement>(container, 'input')

		const user = setupUser()

		await user.type(input, 'b')

		expect(input.value).toBe('b')

		expect(onChange).not.toHaveBeenCalled()
	})
})

describe('FormFilters announcements', () => {
	it('announces the active count politely when filters change, skipping mount', async () => {
		const { rerender } = renderUI(
			<FormFilters aria-label="Filters" value={{ name: 'a' }} onValueChange={() => {}}>
				<FormFiltersField name="name">
					<Input />
				</FormFiltersField>
			</FormFilters>,
		)

		// Wait past the announcer's first write, so that an announcement on mount shows
		// here.
		await flushAnnouncer()

		// Lazily created on first announce; absent means nothing was announced on mount.
		expect(liveRegion()?.textContent ?? '').toBe('')

		rerender(
			<FormFilters aria-label="Filters" value={{ name: 'a', other: 'b' }} onValueChange={() => {}}>
				<FormFiltersField name="name">
					<Input />
				</FormFiltersField>
			</FormFilters>,
		)

		await expectAnnouncement('2 filters active')
	})
})

describe('FormFiltersClear', () => {
	it('clears all filter values when clicked', async () => {
		const onChange = vi.fn()

		renderUI(
			<FormFilters
				aria-label="Filters"
				value={{ name: 'hello', status: 'active' }}
				onValueChange={onChange}
			>
				<FormFiltersField name="name">
					<Input />
				</FormFiltersField>
				<FormFiltersClear>
					<Button>Clear</Button>
				</FormFiltersClear>
			</FormFilters>,
		)

		const user = setupUser()

		await user.click(screen.getByText('Clear'))

		expect(onChange).toHaveBeenCalledWith({})
	})

	it('leaves the fallback trigger on the Button default, and takes an override', () => {
		function bar(props: { variant?: 'soft'; color?: 'red' }) {
			return (
				<FormFilters aria-label="Filters" value={{ name: 'hello' }}>
					<FormFiltersField name="name">
						<Input />
					</FormFiltersField>
					<FormFiltersClear {...props}>Clear</FormFiltersClear>
				</FormFilters>
			)
		}

		// Clearing a filter undoes a view and not a record, so the shared default
		// stays whatever Button's is: an app that wants weight asks for it.
		const plain = bySlot(renderUI(bar({})).container, 'form-filters-clear')?.className ?? ''

		expect(plain).not.toContain('bg-red')

		const loud =
			bySlot(renderUI(bar({ variant: 'soft', color: 'red' })).container, 'form-filters-clear')
				?.className ?? ''

		expect(loud).not.toBe(plain)

		expect(loud).toContain('red')
	})

	it('leaves an element child’s own treatment alone', () => {
		// The clone path lends the child the clear action and nothing else, so the
		// fallback's knobs must not reach it.
		const { container } = renderUI(
			<FormFilters aria-label="Filters" value={{ name: 'hello' }}>
				<FormFiltersField name="name">
					<Input />
				</FormFiltersField>
				<FormFiltersClear variant="soft" color="red">
					<Button>Clear</Button>
				</FormFiltersClear>
			</FormFilters>,
		)

		expect(bySlot(container, 'form-filters-clear')).toBeNull()

		expect(screen.getByText('Clear').className).not.toContain('red')
	})

	it('resets to defaultValue when provided', async () => {
		const onChange = vi.fn()

		const defaults = { name: '', status: 'all' }

		renderUI(
			<FormFilters
				aria-label="Filters"
				value={{ name: 'hello', status: 'active' }}
				defaultValue={defaults}
				onValueChange={onChange}
			>
				<FormFiltersField name="name">
					<Input />
				</FormFiltersField>
				<FormFiltersClear>
					<Button>Clear</Button>
				</FormFiltersClear>
			</FormFilters>,
		)

		const user = setupUser()

		await user.click(screen.getByText('Clear'))

		expect(onChange).toHaveBeenCalledWith(defaults)
	})

	it('preserves the child element onClick alongside the clear behavior', async () => {
		const onChange = vi.fn()

		const childClick = vi.fn()

		renderUI(
			<FormFilters aria-label="Filters" value={{ name: 'hello' }} onValueChange={onChange}>
				<FormFiltersClear>
					<Button onClick={childClick}>Clear</Button>
				</FormFiltersClear>
			</FormFilters>,
		)

		const user = setupUser()

		await user.click(screen.getByText('Clear'))

		expect(childClick).toHaveBeenCalled()

		expect(onChange).toHaveBeenCalled()
	})

	it('merges the FormFiltersClear className into the child element', () => {
		renderUI(
			<FormFilters aria-label="Filters" value={{ name: 'hello' }}>
				<FormFiltersClear className="from-wrapper">
					<Button>Clear</Button>
				</FormFiltersClear>
			</FormFilters>,
		)

		const button = screen.getByText('Clear').closest('button')

		expect(button?.className).toContain('from-wrapper')
	})

	it('hides while there is nothing to clear, and keeps its box in a stack row', async () => {
		function Bar({ layout }: { layout: 'rail' | 'stack' }) {
			return (
				<FormFilters aria-label="Filters" layout={layout}>
					<FormFiltersBar>
						<FormFiltersRow>
							<FormFiltersField name="name">
								<Input aria-label="Name" />
							</FormFiltersField>
						</FormFiltersRow>
						<FormFiltersClear>Clear</FormFiltersClear>
					</FormFiltersBar>
				</FormFilters>
			)
		}

		const rail = renderUI(<Bar layout="rail" />)

		const railClear = getSlot(rail.container, 'form-filters-clear')

		// A rail's fields do not move when the row narrows, so it needs no kept box.
		expect(railClear.className).toMatch(/(^| )hidden( |$)/)

		expect(railClear.className).not.toContain('invisible')

		rail.unmount()

		// A compact stack is a column, so a kept box would be an empty band under the fields.
		const stack = renderUI(<Bar layout="stack" />)

		const stackClear = getSlot(stack.container, 'form-filters-clear')

		expect(stackClear.className).toContain('invisible')

		expect(stackClear.className).toMatch(/(^| )hidden( |$)/)

		expect(stackClear.className).toContain('sm:inline-flex')

		await setupUser().type(screen.getByRole('textbox', { name: 'Name' }), 'a')

		expect(stackClear.className).not.toContain('invisible')

		expect(stackClear.className).not.toMatch(/(^| )hidden( |$)/)
	})

	it('hides while the bar holds its default', () => {
		const { container } = renderUI(
			<FormFilters aria-label="Filters" defaultValue={{ status: 'all' }}>
				<FormFiltersClear>Clear</FormFiltersClear>
			</FormFilters>,
		)

		expect(getSlot(container, 'form-filters-clear').className).toContain('invisible')
	})

	it('moves the focus to the first control after a clear from the keyboard', async () => {
		renderUI(
			<FormFilters aria-label="Filters" defaultValue={{ name: 'hello' }} value={{ name: 'hi' }}>
				<FormFiltersField name="name">
					<Input aria-label="Name" />
				</FormFiltersField>
				<FormFiltersClear>Clear</FormFiltersClear>
			</FormFilters>,
		)

		const clear = screen.getByRole('button', { name: 'Clear' })

		clear.focus()

		await setupUser().keyboard('{Enter}')

		expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus()
	})

	it('leaves the focus alone after a pointer clear', async () => {
		renderUI(
			<FormFilters aria-label="Filters" value={{ name: 'hi' }}>
				<FormFiltersField name="name">
					<Input aria-label="Name" />
				</FormFiltersField>
				<FormFiltersClear>Clear</FormFiltersClear>
			</FormFilters>,
		)

		await setupUser().click(screen.getByRole('button', { name: 'Clear' }))

		expect(screen.getByRole('textbox', { name: 'Name' })).not.toHaveFocus()
	})

	it('renders the default Button for a bare string child', async () => {
		const onChange = vi.fn()

		renderUI(
			<FormFilters aria-label="Filters" value={{ name: 'hello' }} onValueChange={onChange}>
				<FormFiltersClear>Clear all</FormFiltersClear>
			</FormFilters>,
		)

		const user = setupUser()

		// The documented non-element fallback: a bare string renders a default
		// Button instead of throwing through `Children.only`.
		await user.click(screen.getByRole('button', { name: 'Clear all' }))

		expect(onChange).toHaveBeenCalled()
	})
})

describe('useFormFilters', () => {
	it('reports activeCount as the number of non-empty values', () => {
		const { container } = renderUI(
			<FormFilters aria-label="Filters" value={{ a: 'yes', b: '', c: undefined, d: [], e: [1] }}>
				<ActiveCount />
			</FormFilters>,
		)

		// 'yes' and [1] are active, '' and undefined and [] are not
		expect(bySlot(container, 'count')?.textContent).toBe('2')
	})
})

describe('Filter (uncontrolled)', () => {
	it('manages state internally with defaultValue', async () => {
		const { container } = renderUI(
			<FormFilters aria-label="Filters" defaultValue={{ name: '' }}>
				<FormFiltersField name="name">
					<Input />
				</FormFiltersField>
				<ActiveCount />
			</FormFilters>,
		)

		const input = getSlot<HTMLInputElement>(container, 'input')

		const user = setupUser()

		await user.type(input, 'test')

		expect(bySlot(container, 'count')?.textContent).toBe('1')
	})
})

describe('FormFilters extras', () => {
	// The three regions were `ReactNode` props once. The context already escaped
	// the row, so only the layout ever needed them; `FormFiltersBar` and `FormFiltersRow`
	// give that layout a name.
	it('renders the prefix and suffix regions where they are composed', () => {
		const { container } = renderUI(
			<FormFilters aria-label="Filters">
				<FormFiltersPrefix>prefix node</FormFiltersPrefix>
				<FormFiltersBar>
					<FormFiltersRow>
						<span>child</span>
					</FormFiltersRow>
				</FormFiltersBar>
				<FormFiltersSuffix>suffix node</FormFiltersSuffix>
			</FormFilters>,
		)

		expect(bySlot(container, 'form-filters-prefix')?.textContent).toBe('prefix node')

		expect(bySlot(container, 'form-filters-suffix')?.textContent).toBe('suffix node')
	})

	it('renders no region a caller did not compose', () => {
		const { container } = renderUI(
			<FormFilters aria-label="Filters">
				<FormFiltersBar>
					<FormFiltersRow>
						<span>child</span>
					</FormFiltersRow>
				</FormFiltersBar>
			</FormFilters>,
		)

		expect(bySlot(container, 'form-filters-prefix')).toBeNull()

		expect(bySlot(container, 'form-filters-suffix')).toBeNull()
	})

	it('invokes onClear in addition to clearing values', async () => {
		const onClear = vi.fn()

		renderUI(
			<FormFilters aria-label="Filters" value={{ name: 'hello' }} onClear={onClear}>
				<FormFiltersClear>
					<Button>Clear</Button>
				</FormFiltersClear>
			</FormFilters>,
		)

		const user = setupUser()

		await user.click(screen.getByText('Clear'))

		expect(onClear).toHaveBeenCalled()
	})

	it('counts a reset from the form actions as a reset, as a clear is', async () => {
		function Probe() {
			const { reset } = useFormActions() ?? {}

			return (
				<>
					<output data-testid="resets">{useFormResets()}</output>
					<Button onClick={() => reset?.()}>Reset</Button>
				</>
			)
		}

		renderUI(
			<FormFilters aria-label="Filters" defaultValue={{ name: 'hello' }}>
				<Probe />
			</FormFilters>,
		)

		await setupUser().click(screen.getByText('Reset'))

		expect(screen.getByTestId('resets')).toHaveTextContent('1')
	})

	it('stretches its fields to equal width from the row', () => {
		const { container } = renderUI(
			<FormFilters aria-label="Filters">
				<FormFiltersBar>
					<FormFiltersRow equal>
						<FormFiltersField name="a">
							<Input />
						</FormFiltersField>
						<FormFiltersField name="b">
							<Input />
						</FormFiltersField>
					</FormFiltersRow>
				</FormFiltersBar>
			</FormFilters>,
		)

		expect(bySlot(container, 'form-filters-row')?.className).toContain('*:flex-1')
	})

	it('removes a key from the value when the field is set to an empty/inactive value', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(
			<FormFilters aria-label="Filters" defaultValue={{ name: 'hello' }} onValueChange={onChange}>
				<FormFiltersField name="name">
					<Input />
				</FormFiltersField>
			</FormFilters>,
		)

		const input = getSlot<HTMLInputElement>(container, 'input')

		const user = setupUser()

		await user.clear(input)

		// Empty string is inactive: FormFilters drops `name` from the value object.
		expect(onChange).toHaveBeenCalled()

		expect(onChange.mock.lastCall?.[0]).not.toHaveProperty('name')
	})
})

describe('FormFilters context', () => {
	it('keeps its context value while it holds no value', () => {
		const renders = vi.fn()

		function Probe() {
			useFormFilters()

			renders()

			return null
		}

		// Created once, so a second render of the probe comes from a context change.
		const children = <Probe />

		const { rerender } = renderUI(<FormFilters aria-label="Orders">{children}</FormFilters>)

		rerender(<FormFilters aria-label="Open orders">{children}</FormFilters>)

		expect(renders).toHaveBeenCalledOnce()
	})
})

describe('FormFiltersField value types', () => {
	it('infers the value type from an annotated render function', () => {
		renderUI(
			<FormFilters aria-label="Filters" defaultValue={{ tags: ['north', 'south'] }}>
				<FormFiltersField name="tags">
					{({ value }: FormFiltersFieldRenderProps<string[]>) => value?.join(', ')}
				</FormFiltersField>
			</FormFilters>,
		)

		expect(screen.getByText('north, south')).toBeInTheDocument()
	})
})
