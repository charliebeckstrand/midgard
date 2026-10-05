import { useState } from 'react'
import { Field, Label } from 'ui/fieldset'
import { Select, SelectLabel, SelectOption } from 'ui/select'
import { Text } from 'ui/text'
import { countries, countryName } from './countries.ts'

export default function Controlled() {
	const [code, setCode] = useState<string | null>(null)

	return (
		<>
			<Field>
				<Label>Country</Label>
				<Select
					placeholder="Select a country"
					value={code}
					onValueChange={setCode}
					displayValue={countryName}
				>
					{countries.map((country) => (
						<SelectOption key={country.code} value={country.code}>
							<SelectLabel>{country.name}</SelectLabel>
						</SelectOption>
					))}
				</Select>
			</Field>
			<Text>Value: {code ?? 'Empty'}</Text>
		</>
	)
}
