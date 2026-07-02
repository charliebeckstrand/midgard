import { type ComponentProps, createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Form } from '../../components/form'
import { NumberInput } from '../../components/number-input'
import { liveRegion, renderUI, screen, userEvent } from '../helpers'

describe('NumberInput', () => {
	it('renders an input with type number alongside decrease and increase buttons', () => {
		renderUI(<NumberInput />)

		const input = screen.getByRole('spinbutton')

		expect(input).toBeInTheDocument()

		expect(input).toHaveAttribute('type', 'number')

		expect(screen.getByLabelText('Decrease')).toBeInTheDocument()

		expect(screen.getByLabelText('Increase')).toBeInTheDocument()
	})

	it('composes a consumer onBlur with the clamp/round-on-blur contract', async () => {
		const onBlur = vi.fn()

		const onValueChange = vi.fn()

		renderUI(
			<NumberInput defaultValue={15} max={10} onBlur={onBlur} onValueChange={onValueChange} />,
		)

		const input = screen.getByRole('spinbutton')

		const user = userEvent.setup()

		await user.click(input)

		await user.tab()

		// The documented clamp-on-blur must run AND the consumer handler fire.
		expect(onValueChange).toHaveBeenCalledWith(10)

		expect(onBlur).toHaveBeenCalled()
	})

	it('announces the stepped value through the polite live region', async () => {
		renderUI(<NumberInput defaultValue={4} />)

		const user = userEvent.setup()

		await user.click(screen.getByLabelText('Increase'))

		expect(liveRegion()).toHaveTextContent('5')
	})

	it('keeps focus on the input when a stepper is pressed', async () => {
		const onBlur = vi.fn()

		renderUI(<NumberInput defaultValue={5} onBlur={onBlur} />)

		const user = userEvent.setup()

		const input = screen.getByRole('spinbutton')

		await user.click(input)

		expect(input).toHaveFocus()

		await user.click(screen.getByLabelText('Increase'))

		// The tabIndex -1 steppers must not steal focus: blurring the input would
		// end an enclosing edit (e.g. a Grid editable cell that commits on blur)
		// before the step lands.
		expect(input).toHaveFocus()

		expect(onBlur).not.toHaveBeenCalled()
	})

	it('forwards ref', () => {
		const ref = createRef<HTMLInputElement>()

		renderUI(<NumberInput ref={ref} />)

		expect(ref.current).toBeInstanceOf(HTMLInputElement)
	})

	it('disables decrease button at min value', () => {
		renderUI(<NumberInput value={0} min={0} />)

		expect(screen.getByLabelText('Decrease')).toBeDisabled()
	})

	it('disables increase button at max value', () => {
		renderUI(<NumberInput value={10} max={10} />)

		expect(screen.getByLabelText('Increase')).toBeDisabled()
	})

	it('disables all controls when disabled', () => {
		renderUI(<NumberInput disabled />)

		expect(screen.getByRole('spinbutton')).toBeDisabled()

		expect(screen.getByLabelText('Decrease')).toBeDisabled()

		expect(screen.getByLabelText('Increase')).toBeDisabled()
	})

	// Each row renders a NumberInput, clicks a stepper button, and asserts the
	// onValueChange payload. step=1e-7 covers scientific-notation precision
	// derivation; 9.99 + 0.1 with max=10.05 covers clamp-after-round.
	it.each<[string, ComponentProps<typeof NumberInput>, 'Increase' | 'Decrease', number]>([
		[
			'derives step precision from scientific notation',
			{ defaultValue: 0, step: 1e-7 },
			'Increase',
			1e-7,
		],
		[
			'clamps after rounding so a stepped value never exceeds max',
			{ defaultValue: 9.99, step: 0.1, max: 10.05 },
			'Increase',
			10.05,
		],
		['calls onValueChange when increase button is clicked', { defaultValue: 5 }, 'Increase', 6],
		['calls onValueChange when decrease button is clicked', { defaultValue: 5 }, 'Decrease', 4],
		['respects step value', { defaultValue: 0, step: 5 }, 'Increase', 5],
		['seeds the value to 0 when increase is clicked from an empty state', {}, 'Increase', 0],
		[
			'clamps to max when increase would overshoot',
			{ defaultValue: 9, max: 10, step: 5 },
			'Increase',
			10,
		],
		[
			'clamps to min when decrease would undershoot',
			{ defaultValue: 1, min: 0, step: 5 },
			'Decrease',
			0,
		],
		['rounds at the step precision', { defaultValue: 0, step: 0.1 }, 'Increase', 0.1],
	])('%s', async (_name, props, button, expected) => {
		const onValueChange = vi.fn()

		renderUI(<NumberInput {...props} onValueChange={onValueChange} />)

		const user = userEvent.setup()

		await user.click(screen.getByLabelText(button))

		expect(onValueChange).toHaveBeenCalledWith(expected)
	})

	it('updates the value via direct typing', async () => {
		const onChange = vi.fn()

		renderUI(<NumberInput onValueChange={onChange} />)

		const user = userEvent.setup()

		const input = screen.getByRole('spinbutton')

		await user.type(input, '7')

		expect(onChange).toHaveBeenCalledWith(7)
	})

	it('does not clamp while typing a value whose prefix is below min', async () => {
		const onChange = vi.fn()

		renderUI(<NumberInput min={10} onValueChange={onChange} />)

		const user = userEvent.setup()

		const input = screen.getByRole('spinbutton') as HTMLInputElement

		// With min={10}, clamping per keystroke would snap "1" to "10" and make
		// "15" impossible to type. The raw digit must survive until blur.
		await user.type(input, '1')

		expect(onChange).toHaveBeenLastCalledWith(1)

		expect(input.value).toBe('1')
	})

	it('clamps to min on blur when the committed value is out of range', async () => {
		const onChange = vi.fn()

		renderUI(<NumberInput min={10} onValueChange={onChange} />)

		const user = userEvent.setup()

		const input = screen.getByRole('spinbutton') as HTMLInputElement

		await user.type(input, '5')

		await user.tab()

		expect(onChange).toHaveBeenLastCalledWith(10)
	})

	it('clears the value when the input is emptied', async () => {
		const onChange = vi.fn()

		renderUI(<NumberInput defaultValue={7} onValueChange={onChange} />)

		const user = userEvent.setup()

		const input = screen.getByRole('spinbutton') as HTMLInputElement

		await user.clear(input)

		expect(onChange).toHaveBeenLastCalledWith(undefined)
	})

	it('binds to a Form field by name, writing through field.setValue', async () => {
		const onSubmit = vi.fn()

		renderUI(
			<Form defaultValues={{ qty: 0 }} onSubmit={onSubmit}>
				<NumberInput name="qty" />
				<button type="submit">Submit</button>
			</Form>,
		)

		const user = userEvent.setup()

		const input = screen.getByRole('spinbutton') as HTMLInputElement

		await user.type(input, '5')

		await user.click(screen.getByRole('button', { name: 'Submit' }))

		expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ qty: 5 }), expect.anything())
	})

	it('ignores typed input that does not parse as a number', async () => {
		const onChange = vi.fn()

		renderUI(<NumberInput onValueChange={onChange} />)

		const user = userEvent.setup()

		const input = screen.getByRole('spinbutton') as HTMLInputElement

		// `userEvent.type` writes one character at a time; 'e' is the only
		// keystroke jsdom accepts on a type="number" input that yields NaN.
		await user.type(input, 'e')

		expect(onChange).not.toHaveBeenCalled()
	})
})
