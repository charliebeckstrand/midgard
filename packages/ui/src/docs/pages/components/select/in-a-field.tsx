import { Description, Field, Label } from 'ui/fieldset'
import { Select, SelectLabel, SelectOption } from 'ui/select'
import { countries, countryName } from './countries.ts'

export default function InAField() {
	return (
		<Field>
			<Label>Country</Label>
			<Description>Your country sets the shipping cost and the taxes.</Description>
			<Select placeholder="Select a country" displayValue={countryName}>
				{countries.map((country) => (
					<SelectOption key={country.code} value={country.code}>
						<SelectLabel>{country.name}</SelectLabel>
					</SelectOption>
				))}
			</Select>
		</Field>
	)
}
