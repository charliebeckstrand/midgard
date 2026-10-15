import { describe, expect, it } from 'vitest'
import { Combobox, ComboboxOption } from '../../components/combobox'
import { CurrencyInput } from '../../components/currency-input'
import { Form } from '../../components/form'
import { fireEvent, getSlot, renderUI, screen } from '../helpers'

// A Form reset sets a bound field back to its default. The typed text of the
// field is a partial entry, so the reset drops it too, as TagInput and
// DateInput do.

function resetForm() {
	fireEvent.click(screen.getByRole('button', { name: 'Reset form' }))
}

describe('Form reset of a bound control with a partial entry', () => {
	it('drops the typed text of a CurrencyInput that equals the default amount', () => {
		renderUI(
			<Form defaultValues={{ price: 5 }}>
				<CurrencyInput aria-label="Price" name="price" />
				<button type="reset">Reset form</button>
			</Form>,
		)

		const input = screen.getByRole('textbox') as HTMLInputElement

		const seeded = input.value

		fireEvent.focus(input)

		fireEvent.change(input, { target: { value: '5.0' } })

		expect(input.value).not.toBe(seeded)

		resetForm()

		expect(input.value).toBe(seeded)
	})

	it('drops the query of a Combobox', () => {
		const { container } = renderUI(
			<Form defaultValues={{ fruit: 'v1' }}>
				<Combobox<string> name="fruit" displayValue={(v) => v}>
					<ComboboxOption value="v1">One</ComboboxOption>
				</Combobox>
				<button type="reset">Reset form</button>
			</Form>,
		)

		const input = getSlot<HTMLInputElement>(container, 'combobox-input')

		const seeded = input.value

		fireEvent.change(input, { target: { value: 'zz' } })

		expect(input.value).toBe('zz')

		resetForm()

		expect(input.value).toBe(seeded)
	})
})
