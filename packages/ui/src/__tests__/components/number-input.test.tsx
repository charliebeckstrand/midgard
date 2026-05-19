import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { NumberInput } from '../../components/number-input'
import { renderUI, screen, userEvent } from '../helpers'

describe('NumberInput', () => {
	it('renders an input with type number', () => {
		renderUI(<NumberInput />)

		const input = screen.getByRole('spinbutton')

		expect(input).toBeInTheDocument()

		expect(input).toHaveAttribute('type', 'number')
	})

	it('renders decrease and increase buttons', () => {
		renderUI(<NumberInput />)

		expect(screen.getByLabelText('Decrease')).toBeInTheDocument()

		expect(screen.getByLabelText('Increase')).toBeInTheDocument()
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

	it('clears the value when the input is emptied', async () => {
		const onChange = vi.fn()

		renderUI(<NumberInput defaultValue={7} onValueChange={onChange} />)

		const user = userEvent.setup()

		const input = screen.getByRole('spinbutton') as HTMLInputElement

		await user.clear(input)

		expect(onChange).toHaveBeenLastCalledWith(undefined)
	})

	it('ignores typed input that does not parse as a number', async () => {
		const onChange = vi.fn()

		renderUI(<NumberInput onValueChange={onChange} />)

		const user = userEvent.setup()

		const input = screen.getByRole('spinbutton') as HTMLInputElement

		// `userEvent.type` writes one character at a time; typing 'e' is the only
		// keystroke jsdom accepts on a type="number" input that doesn't yield a
		// parseable number, hitting the Number.isNaN guard.
		await user.type(input, 'e')

		expect(onChange).not.toHaveBeenCalled()
	})
})
