import { Description, Field, Label } from 'ui/fieldset'
import { Select, SelectLabel, SelectOption } from 'ui/select'
import { countries, countryName } from './countries.ts'

export default function InAField() {
	return (
		<Field>
			<Label>Country</Label>
			<Description>We use your country to calculate shipping and taxes.</Description>
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
