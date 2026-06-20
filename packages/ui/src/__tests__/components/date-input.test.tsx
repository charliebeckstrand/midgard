import { createRef, type ReactElement, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from '../../components/button'
import { DateInput } from '../../components/date-input'
import { Field, Label } from '../../components/fieldset'
import { Form } from '../../components/form'
import { bySlot, renderUI, screen, userEvent } from '../helpers'

// Controlled usage with an external setter: the harness can move the value
// while the input holds in-progress text.
function ControlledDateInput({ onValueChange }: { onValueChange?: (v: Date | undefined) => void }) {
	const [date, setDate] = useState<Date | null>(null)

	return (
		<>
			<DateInput
				value={date}
				onValueChange={(v) => {
					setDate(v ?? null)

					onValueChange?.(v)
				}}
			/>
			<Button onClick={() => setDate(new Date(2026, 11, 25))}>Set Christmas</Button>
		</>
	)
}

describe('DateInput', () => {
	it('renders an input with data-slot="date-input" and numeric input mode', () => {
		const { container } = renderUI(<DateInput />)

		const input = bySlot(container, 'date-input')

		expect(input).toBeInTheDocument()

		expect(input?.tagName).toBe('INPUT')

		expect(input).toHaveAttribute('inputmode', 'numeric')
	})

	it('forwards ref', () => {
		const ref = createRef<HTMLInputElement>()

		renderUI(<DateInput ref={ref} />)

		expect(ref.current).toBeInstanceOf(HTMLInputElement)
	})

	it.each<[string, () => ReactElement, string, string]>([
		[
			'uses the format as the default placeholder',
			() => <DateInput />,
			'placeholder',
			'MM/DD/YYYY',
		],
		[
			'lets an explicit placeholder win',
			() => <DateInput placeholder="Due date" />,
			'placeholder',
			'Due date',
		],
		[
			'defaults an aria-label when no Field label wraps it',
			() => <DateInput />,
			'aria-label',
			'Date',
		],
	])('%s', (_name, ui, attr, value) => {
		const { container } = renderUI(ui())

		expect(bySlot(container, 'date-input')).toHaveAttribute(attr, value)
	})

	it('yields the aria-label default to a registered Field Label', () => {
		const { container } = renderUI(
			<Field>
				<Label>Due date</Label>
				<DateInput />
			</Field>,
		)

		expect(bySlot(container, 'date-input')).not.toHaveAttribute('aria-label')
	})

	it('renders a calendar icon suffix by default and removes it with suffix={false}', () => {
		const { container } = renderUI(<DateInput />)

		expect(container.querySelector('[data-slot=suffix] [data-slot=icon]')).toBeInTheDocument()

		const { container: bare } = renderUI(<DateInput suffix={false} />)

		expect(bare.querySelector('[data-slot=suffix]')).not.toBeInTheDocument()
	})

	it('masks typed digits and emits the parsed Date once complete', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<DateInput onValueChange={onChange} />)

		const input = bySlot(container, 'date-input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, '12252026')

		expect(input.value).toBe('12/25/2026')

		const emitted = onChange.mock.lastCall?.[0] as Date

		expect(emitted.getFullYear()).toBe(2026)
		expect(emitted.getMonth()).toBe(11)
		expect(emitted.getDate()).toBe(25)
	})

	it('pads segments typed with separators', async () => {
		const { container } = renderUI(<DateInput />)

		const input = bySlot(container, 'date-input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, '1/5/2026')

		expect(input.value).toBe('01/05/2026')
	})

	it('emits undefined when a complete date is edited back to partial', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<DateInput onValueChange={onChange} />)

		const input = bySlot(container, 'date-input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, '12252026')

		await user.type(input, '{Backspace}')

		expect(input.value).toBe('12/25/202')

		expect(onChange).toHaveBeenLastCalledWith(undefined)
	})

	it('deletes the digit before a trailing separator on backspace', async () => {
		const { container } = renderUI(<DateInput />)

		const input = bySlot(container, 'date-input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, '12')

		expect(input.value).toBe('12/')

		await user.type(input, '{Backspace}')

		expect(input.value).toBe('1')
	})

	it('marks a complete impossible date invalid without emitting it', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<DateInput onValueChange={onChange} />)

		const input = bySlot(container, 'date-input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, '02312025')

		expect(input.value).toBe('02/31/2025')

		expect(input).toHaveAttribute('aria-invalid', 'true')

		expect(onChange).not.toHaveBeenCalledWith(expect.any(Date))
	})

	it('marks a complete out-of-range date invalid', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(
			<DateInput
				min={new Date(2026, 0, 1)}
				max={new Date(2026, 11, 31)}
				onValueChange={onChange}
			/>,
		)

		const input = bySlot(container, 'date-input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, '06152027')

		expect(input).toHaveAttribute('aria-invalid', 'true')

		expect(onChange).not.toHaveBeenCalledWith(expect.any(Date))
	})

	it('keeps partial text on blur and marks it invalid', async () => {
		const { container } = renderUI(<DateInput />)

		const input = bySlot(container, 'date-input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, '12/3')

		expect(input).not.toHaveAttribute('aria-invalid')

		await user.tab()

		expect(input.value).toBe('12/3')

		expect(input).toHaveAttribute('aria-invalid', 'true')
	})

	it('keeps a two-digit year as typed on blur and marks it invalid', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<DateInput onValueChange={onChange} />)

		const input = bySlot(container, 'date-input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, '122526')

		expect(input.value).toBe('12/25/26')

		// Still partial while typing: no Date emitted yet.
		expect(onChange).not.toHaveBeenCalledWith(expect.any(Date))

		await user.tab()

		// The two-digit year is no longer expanded; the entry stays as typed and
		// reads invalid.
		expect(input.value).toBe('12/25/26')

		expect(input).toHaveAttribute('aria-invalid', 'true')

		expect(onChange).not.toHaveBeenCalledWith(expect.any(Date))
	})

	it('commits a four-digit year typed past a two-digit state', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<DateInput onValueChange={onChange} />)

		const input = bySlot(container, 'date-input') as HTMLInputElement

		const user = userEvent.setup()

		// The four-digit year passes through a two-digit state; it must not commit
		// as 2020 before the full year is typed.
		await user.type(input, '122520')

		expect(input.value).toBe('12/25/20')

		expect(onChange).not.toHaveBeenCalledWith(expect.any(Date))

		await user.type(input, '26')

		expect(input.value).toBe('12/25/2026')

		expect(onChange.mock.lastCall?.[0]).toBeInstanceOf(Date)

		expect((onChange.mock.lastCall?.[0] as Date).getFullYear()).toBe(2026)
	})

	it('renders the invalid-format message for a complete impossible date', async () => {
		const { container } = renderUI(<DateInput />)

		const input = bySlot(container, 'date-input') as HTMLInputElement

		const user = userEvent.setup()

		expect(bySlot(container, 'message')).not.toBeInTheDocument()

		await user.type(input, '02312025')

		const message = bySlot(container, 'message')

		expect(message).toBeInTheDocument()

		expect(message).toHaveAttribute('role', 'alert')

		expect(message).toHaveTextContent('Enter a valid date (MM/DD/YYYY)')
	})

	it('renders the message on blur for a partial entry and wires aria-describedby', async () => {
		const { container } = renderUI(
			<Field>
				<Label>Due date</Label>
				<DateInput />
			</Field>,
		)

		const input = bySlot(container, 'date-input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, '12/3')

		await user.tab()

		const message = bySlot(container, 'message')

		expect(message).toBeInTheDocument()

		expect(input.getAttribute('aria-describedby')).toBe(message?.id)
	})

	it('uses a custom invalid message and clears it once valid', async () => {
		const { container } = renderUI(<DateInput invalidMessage="Bad date" />)

		const input = bySlot(container, 'date-input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, '02312025')

		expect(bySlot(container, 'message')).toHaveTextContent('Bad date')

		await user.clear(input)

		await user.type(input, '02282025')

		expect(bySlot(container, 'message')).not.toBeInTheDocument()
	})

	it('suppresses the built-in message when invalidMessage is null', async () => {
		const { container } = renderUI(<DateInput invalidMessage={null} />)

		const input = bySlot(container, 'date-input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, '02312025')

		expect(input).toHaveAttribute('aria-invalid', 'true')

		expect(bySlot(container, 'message')).not.toBeInTheDocument()
	})

	it('clears the invalid mark once edited back to valid', async () => {
		const { container } = renderUI(<DateInput />)

		const input = bySlot(container, 'date-input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, '02312025')

		expect(input).toHaveAttribute('aria-invalid', 'true')

		await user.type(input, '{Backspace}{Backspace}{Backspace}{Backspace}2026')

		expect(input.value).toBe('02/31/2026')

		// Still impossible; correct the day too.
		await user.clear(input)

		await user.type(input, '02282026')

		expect(input).not.toHaveAttribute('aria-invalid')
	})

	it.each<[string, () => ReactElement, string]>([
		[
			'formats defaultValue on initial render',
			() => <DateInput defaultValue={new Date(2026, 5, 1)} />,
			'06/01/2026',
		],
		[
			'renders a controlled value through the format',
			() => <DateInput value={new Date(2026, 5, 15)} format="YYYY-MM-DD" />,
			'2026-06-15',
		],
		[
			'renders a form-bound Date default through the format',
			() => (
				<Form defaultValues={{ due: new Date(2026, 5, 15) }}>
					<DateInput name="due" />
				</Form>
			),
			'06/15/2026',
		],
	])('%s', (_name, ui, expected) => {
		const { container } = renderUI(ui())

		expect((bySlot(container, 'date-input') as HTMLInputElement).value).toBe(expected)
	})

	it('lets an external value change override in-progress text', async () => {
		const { container } = renderUI(<ControlledDateInput />)

		const input = bySlot(container, 'date-input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, '12/3')

		await user.click(screen.getByRole('button', { name: 'Set Christmas' }))

		expect(input.value).toBe('12/25/2026')

		expect(input).not.toHaveAttribute('aria-invalid')
	})

	it('does not re-emit when the typed text re-states the controlled day', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(
			<DateInput value={new Date(2026, 5, 15, 9, 30)} onValueChange={onChange} />,
		)

		const input = bySlot(container, 'date-input') as HTMLInputElement

		const user = userEvent.setup()

		// Retype the final digit: the text leaves and re-enters the held day.
		await user.type(input, '{Backspace}')

		expect(onChange).toHaveBeenLastCalledWith(undefined)

		const calls = onChange.mock.calls.length

		await user.type(input, '6')

		expect(input.value).toBe('06/15/2026')

		expect(onChange.mock.calls.length).toBe(calls)

		expect(input).not.toHaveAttribute('aria-invalid')
	})

	it('disables the input when disabled', () => {
		const { container } = renderUI(<DateInput disabled />)

		expect(bySlot(container, 'date-input')).toBeDisabled()
	})

	it('binds to a Form field by name, storing the Date', async () => {
		const onSubmit = vi.fn()

		const { container } = renderUI(
			<Form defaultValues={{ due: undefined as Date | undefined }} onSubmit={onSubmit}>
				<DateInput name="due" />
				<button type="submit">Submit</button>
			</Form>,
		)

		const input = bySlot(container, 'date-input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, '12252026')

		await user.click(screen.getByRole('button', { name: 'Submit' }))

		const submitted = onSubmit.mock.lastCall?.[0]?.due as Date

		expect(submitted.getFullYear()).toBe(2026)
		expect(submitted.getMonth()).toBe(11)
		expect(submitted.getDate()).toBe(25)
	})
})
