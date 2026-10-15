import { describe, expect, it } from 'vitest'
import { Select, SelectOption } from '../../components/select'
import { bySlot, fireEvent, renderUI, screen } from '../helpers'

describe('Select', () => {
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

	it('shows placeholder text by default', () => {
		const { container } = renderUI(
			<Select placeholder="Pick one">
				<div>Option</div>
			</Select>,
		)

		expect(container.textContent).toContain('Pick one')
	})

	// APG select-only combobox: ArrowDown and ArrowUp open the closed list, as
	// they do on Combobox.
	it.each(['ArrowDown', 'ArrowUp'])('opens the menu on %s from the closed trigger', (key) => {
		renderUI(
			<Select aria-label="Fruit">
				<SelectOption value="apple">Apple</SelectOption>
			</Select>,
		)

		const trigger = screen.getByRole('combobox', { name: 'Fruit' })

		const event = fireEvent.keyDown(trigger, { key })

		expect(trigger).toHaveAttribute('aria-expanded', 'true')

		// The key opens the menu and does not scroll the page.
		expect(event).toBe(false)
	})

	it('does not open the menu on ArrowDown while read-only', () => {
		renderUI(
			<Select aria-label="Fruit" readOnly>
				<SelectOption value="apple">Apple</SelectOption>
			</Select>,
		)

		const trigger = screen.getByRole('combobox', { name: 'Fruit' })

		fireEvent.keyDown(trigger, { key: 'ArrowDown' })

		expect(trigger).toHaveAttribute('aria-expanded', 'false')
	})
})
