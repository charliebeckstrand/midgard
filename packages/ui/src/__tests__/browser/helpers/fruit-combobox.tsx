import { Combobox, ComboboxLabel, ComboboxOption } from '../../../components/combobox'

/**
 * A Combobox of two fruits, Apple and Apricot, with the placeholder `Search`. The value shows as
 * the text of the input.
 *
 * Both names start with `Ap`, so a query can match one option or the two.
 */
export function FruitCombobox() {
	return (
		<Combobox<string> displayValue={(value) => value} placeholder="Search">
			<ComboboxOption value="apple">
				<ComboboxLabel>Apple</ComboboxLabel>
			</ComboboxOption>
			<ComboboxOption value="apricot">
				<ComboboxLabel>Apricot</ComboboxLabel>
			</ComboboxOption>
		</Combobox>
	)
}
