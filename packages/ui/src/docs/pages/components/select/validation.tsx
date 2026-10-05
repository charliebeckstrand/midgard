import { Field, Label, Message } from 'ui/fieldset'
import { Select, SelectLabel, SelectOption } from 'ui/select'
import { countries, countryName } from './countries.ts'

export default function Validation() {
	return (
		<>
			<Field severity="error">
				<Label>Billing country</Label>
				<Select placeholder="Select a country" displayValue={countryName}>
					{countries.map((country) => (
						<SelectOption key={country.code} value={country.code}>
							<SelectLabel>{country.name}</SelectLabel>
						</SelectOption>
					))}
				</Select>
				<Message>Select the country of your billing address.</Message>
			</Field>
			<Field severity="warning">
				<Label>Shipping country</Label>
				<Select defaultValue="jp" displayValue={countryName}>
					{countries.map((country) => (
						<SelectOption key={country.code} value={country.code}>
							<SelectLabel>{country.name}</SelectLabel>
						</SelectOption>
					))}
				</Select>
				<Message severity="warning">Delivery to Japan can take up to two weeks.</Message>
			</Field>
			<Field severity="success">
				<Label>Return country</Label>
				<Select defaultValue="ca" displayValue={countryName}>
					{countries.map((country) => (
						<SelectOption key={country.code} value={country.code}>
							<SelectLabel>{country.name}</SelectLabel>
						</SelectOption>
					))}
				</Select>
				<Message severity="success">Returns from Canada are free.</Message>
			</Field>
		</>
	)
}
