import { describe, expect, vi } from 'vitest'
import type { AddressProvider, AddressSuggestion } from '../../components/address-input'
import { AddressInput } from '../../components/address-input'
import { Form } from '../../modules/form'
import { useFormActions } from '../../primitives/form/context'
import { fireEvent, getSlot, renderUI, screen } from '../helpers'
import { it } from '../helpers/fake-clock'

// A Form reset or a `setValue` changes the bound field. A pick of the same
// suggestion after that is a change, so `onValueChange` must report it
// (CONVENTIONS §7.3).

const main: AddressSuggestion = { id: '1', label: 'Main St' }

// The provider gives the same objects on each fetch, so the second pick
// selects the object of the first pick.
const stableProvider: AddressProvider = async () => [main]

function ClearField() {
	const actions = useFormActions()

	return (
		<button type="button" onClick={() => actions?.setValue('address', undefined)}>
			Clear field
		</button>
	)
}

function renderBound(onValueChange: (value: AddressSuggestion | null) => void) {
	return renderUI(
		<Form defaultValues={{ address: undefined as AddressSuggestion | undefined }}>
			<AddressInput
				name="address"
				provider={stableProvider}
				debounceMs={0}
				minQueryLength={1}
				onValueChange={onValueChange}
			/>
			<ClearField />
			<button type="reset">Reset form</button>
		</Form>,
	)
}

describe('AddressInput re-pick of a bound field', () => {
	it.for([
		['a Form reset', 'Reset form'],
		['a field setValue', 'Clear field'],
	])('reports a pick of the same suggestion after %s', async ([_, button], { clock }) => {
		const onValueChange = vi.fn()

		const { container } = renderBound(onValueChange)

		const input = getSlot<HTMLInputElement>(container, 'combobox-input')

		async function pick() {
			await clock.user.clear(input)

			await clock.user.type(input, 'm')

			await clock.advance(0)

			await clock.user.click(screen.getByRole('option', { name: /Main St/ }))
		}

		await pick()

		expect(onValueChange).toHaveBeenCalledExactlyOnceWith(main)

		fireEvent.click(screen.getByRole('button', { name: button }))

		expect(input.value).toBe('')

		await pick()

		expect(onValueChange).toHaveBeenCalledTimes(2)

		expect(onValueChange).toHaveBeenLastCalledWith(main)
	})
})
