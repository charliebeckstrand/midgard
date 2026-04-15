import { describe, expect, it } from 'vitest'
import { Select } from '../../components/select'
import { bySlot, renderUI } from '../helpers'

describe('Select', () => {
	it('renders with data-slot="control"', () => {
		const { container } = renderUI(
			<Select>
				<div>Option</div>
			</Select>,
		)

		const el = bySlot(container, 'control')

		expect(el).toBeInTheDocument()
	})

	it('renders a combobox trigger button', () => {
		const { container } = renderUI(
			<Select>
				<div>Option</div>
			</Select>,
		)

		const button = bySlot(container, 'listbox-button')

		expect(button).toBeInTheDocument()

		expect(button).toHaveAttribute('role', 'combobox')
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<Select className="custom">
				<div>Option</div>
			</Select>,
		)

		const el = bySlot(container, 'control')

		expect(el?.className).toContain('custom')
	})

	it('shows placeholder text by default', () => {
		const { container } = renderUI(
			<Select placeholder="Pick one">
				<div>Option</div>
			</Select>,
		)

		expect(container.textContent).toContain('Pick one')
	})
})
