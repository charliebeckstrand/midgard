import { describe, expect, it } from 'vitest'
import { Combobox } from '../../components/combobox'
import { bySlot, renderUI } from '../helpers'

describe('Combobox', () => {
	it('renders with data-slot="control"', () => {
		const { container } = renderUI(
			<Combobox>
				<div>Option</div>
			</Combobox>,
		)

		const el = bySlot(container, 'control')

		expect(el).toBeInTheDocument()
	})

	it('renders input with combobox role', () => {
		const { container } = renderUI(
			<Combobox>
				<div>Option</div>
			</Combobox>,
		)

		const input = bySlot(container, 'combobox-input')

		expect(input).toBeInTheDocument()

		expect(input).toHaveAttribute('role', 'combobox')
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<Combobox className="custom">
				<div>Option</div>
			</Combobox>,
		)

		const el = bySlot(container, 'control')

		expect(el?.className).toContain('custom')
	})

	it('renders placeholder text', () => {
		const { container } = renderUI(
			<Combobox placeholder="Type here">
				<div>Option</div>
			</Combobox>,
		)

		const input = bySlot(container, 'combobox-input')

		expect(input).toHaveAttribute('placeholder', 'Type here')
	})

	it('renders icon slot', () => {
		const { container } = renderUI(
			<Combobox>
				<div>Option</div>
			</Combobox>,
		)

		const icon = bySlot(container, 'icon')

		expect(icon).toBeInTheDocument()
	})
})
