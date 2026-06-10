import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Form } from '../../components/form'
import { NumberInput } from '../../components/number-input'
import { Density } from '../../primitives/density'
import { renderUI, screen, userEvent } from '../helpers'

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

	it('derives step precision from scientific notation', async () => {
		const onValueChange = vi.fn()

		renderUI(<NumberInput defaultValue={0} step={1e-7} onValueChange={onValueChange} />)

		const user = userEvent.setup()

		// (1e-7).toString() is "1e-7"; a naive split('.') read precision 0 and
		// rounded the step away entirely.
		await user.click(screen.getByLabelText('Increase'))

		expect(onValueChange).toHaveBeenCalledWith(1e-7)
	})

	it('clamps after rounding so a stepped value never exceeds max', async () => {
		const onValueChange = vi.fn()

		// 9.99 + 0.1 = 10.09 → rounded to precision 1 → 10.1; clamping must run
		// after the rounding, landing exactly on max.
		renderUI(
			<NumberInput defaultValue={9.99} step={0.1} max={10.05} onValueChange={onValueChange} />,
		)

		const user = userEvent.setup()

		await user.click(screen.getByLabelText('Increase'))

		expect(onValueChange).toHaveBeenCalledWith(10.05)
	})

	it('announces the stepped value through the polite live region', async () => {
		renderUI(<NumberInput defaultValue={4} />)

		const user = userEvent.setup()

		await user.click(screen.getByLabelText('Increase'))

		const politeRegion = document.body.querySelector(
			'[data-slot="live-region"][aria-live="polite"]',
		)

		await vi.waitFor(() => expect(politeRegion).toHaveTextContent('5'))
	})

	it('forwards ref', () => {
		const ref = createRef<HTMLInputElement>()

		renderUI(<NumberInput ref={ref} />)

		expect(ref.current).toBeInstanceOf(HTMLInputElement)
	})

	it('calls onValueChange when increase button is clicked', async () => {
		const onChange = vi.fn()

		renderUI(<NumberInput defaultValue={5} onValueChange={onChange} />)

		const user = userEvent.setup()

		await user.click(screen.getByLabelText('Increase'))

		expect(onChange).toHaveBeenCalledWith(6)
	})

	it('calls onValueChange when decrease button is clicked', async () => {
		const onChange = vi.fn()

		renderUI(<NumberInput defaultValue={5} onValueChange={onChange} />)

		const user = userEvent.setup()

		await user.click(screen.getByLabelText('Decrease'))

		expect(onChange).toHaveBeenCalledWith(4)
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

	it('respects step value', async () => {
		const onChange = vi.fn()

		renderUI(<NumberInput defaultValue={0} step={5} onValueChange={onChange} />)

		const user = userEvent.setup()

		await user.click(screen.getByLabelText('Increase'))

		expect(onChange).toHaveBeenCalledWith(5)
	})

	it('seeds the value to 0 when increase is clicked from an empty state', async () => {
		const onChange = vi.fn()

		renderUI(<NumberInput onValueChange={onChange} />)

		const user = userEvent.setup()

		await user.click(screen.getByLabelText('Increase'))

		expect(onChange).toHaveBeenCalledWith(0)
	})

	it('clamps to max when increase would overshoot', async () => {
		const onChange = vi.fn()

		renderUI(<NumberInput defaultValue={9} max={10} step={5} onValueChange={onChange} />)

		const user = userEvent.setup()

		await user.click(screen.getByLabelText('Increase'))

		expect(onChange).toHaveBeenCalledWith(10)
	})

	it('clamps to min when decrease would undershoot', async () => {
		const onChange = vi.fn()

		renderUI(<NumberInput defaultValue={1} min={0} step={5} onValueChange={onChange} />)

		const user = userEvent.setup()

		await user.click(screen.getByLabelText('Decrease'))

		expect(onChange).toHaveBeenCalledWith(0)
	})

	it('rounds at the step precision', async () => {
		const onChange = vi.fn()

		renderUI(<NumberInput defaultValue={0} step={0.1} onValueChange={onChange} />)

		const user = userEvent.setup()

		await user.click(screen.getByLabelText('Increase'))

		expect(onChange).toHaveBeenCalledWith(0.1)
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

describe('NumberInput density inheritance', () => {
	// The underlying <Input> brings a unique text class per size; matching it
	// confirms the spinbutton inherits the ambient density rather than a hardcoded default.
	const textClassFor = { sm: 'text-sm', md: 'text-base', lg: 'text-lg' } as const

	it('inherits size from the Density context when no explicit prop is set', () => {
		renderUI(
			<Density scale="lg">
				<NumberInput />
			</Density>,
		)

		expect(screen.getByRole('spinbutton').className).toContain(textClassFor.lg)
	})

	it('reserves stepper-button padding that tracks the inherited size', () => {
		renderUI(
			<Density scale="lg">
				<NumberInput />
			</Density>,
		)

		expect(screen.getByRole('spinbutton').className).toContain('pr-20')
	})

	it('explicit size prop overrides Density inheritance', () => {
		renderUI(
			<Density scale="lg">
				<NumberInput size="sm" />
			</Density>,
		)

		expect(screen.getByRole('spinbutton').className).toContain(textClassFor.sm)
	})

	it('falls back to "md" outside any density context', () => {
		renderUI(<NumberInput />)

		expect(screen.getByRole('spinbutton').className).toContain(textClassFor.md)
	})
})
