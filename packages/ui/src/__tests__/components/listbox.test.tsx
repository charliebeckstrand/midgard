import { describe, expect, it } from 'vitest'
import { Listbox } from '../../components/listbox'
import { bySlot, renderUI, screen } from '../helpers'

describe('Listbox', () => {
	it('renders with data-slot="control"', () => {
		const { container } = renderUI(
			<Listbox>
				<div>Option</div>
			</Listbox>,
		)

		const el = bySlot(container, 'control')

		expect(el).toBeInTheDocument()
	})

	it('renders trigger button with combobox role', () => {
		const { container } = renderUI(
			<Listbox>
				<div>Option</div>
			</Listbox>,
		)

		const button = bySlot(container, 'listbox-button')

		expect(button).toBeInTheDocument()

		expect(button).toHaveAttribute('role', 'combobox')
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<Listbox className="custom">
				<div>Option</div>
			</Listbox>,
		)

		const el = bySlot(container, 'control')

		expect(el?.className).toContain('custom')
	})

	it('shows placeholder when no value selected', () => {
		renderUI(
			<Listbox placeholder="Choose">
				<div>Option</div>
			</Listbox>,
		)

		expect(screen.getByText('Choose')).toBeInTheDocument()
	})

	it('renders trigger as a button element', () => {
		const { container } = renderUI(
			<Listbox>
				<div>Option</div>
			</Listbox>,
		)

		const button = bySlot(container, 'listbox-button')

		expect(button?.tagName).toBe('BUTTON')
	})

	it('renders a placeholder in skeleton mode', () => {
		const { container } = renderUI(
			<Listbox>
				<div>Option</div>
			</Listbox>,
			{ skeleton: true },
		)

		expect(bySlot(container, 'listbox-button')).not.toBeInTheDocument()
		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})
})
