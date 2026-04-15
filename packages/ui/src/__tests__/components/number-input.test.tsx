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

	it('calls onChange when increase button is clicked', async () => {
		const onChange = vi.fn()

		renderUI(<NumberInput defaultValue={5} onChange={onChange} />)

		const user = userEvent.setup()

		await user.click(screen.getByLabelText('Increase'))

		expect(onChange).toHaveBeenCalledWith(6)
	})

	it('calls onChange when decrease button is clicked', async () => {
		const onChange = vi.fn()

		renderUI(<NumberInput defaultValue={5} onChange={onChange} />)

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

		renderUI(<NumberInput defaultValue={0} step={5} onChange={onChange} />)

		const user = userEvent.setup()

		await user.click(screen.getByLabelText('Increase'))

		expect(onChange).toHaveBeenCalledWith(5)
	})
})
