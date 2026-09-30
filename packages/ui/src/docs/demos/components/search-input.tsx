import { useState } from 'react'
import { Field, Label } from '../../../components/fieldset'
import { SearchInput } from '../../../components/search-input'
import { Axes, Example } from '../../engine'

export const meta = { category: 'input' }

const placeholder = 'Search'

function ControlledExample() {
	const [value, setValue] = useState('')

	return (
		<Field>
			<Label>Search</Label>
			<SearchInput
				value={value}
				onChange={(event) => setValue(event.target.value)}
				onClear={() => setValue('')}
				placeholder={placeholder}
			/>
		</Field>
	)
}

export function Demo() {
	return (
		<>
			<Axes
				of="SearchInput"
				render={(props, label) => <SearchInput {...props} aria-label={label} placeholder={label} />}
			/>

			<Example title="Controlled with clear">
				<ControlledExample />
			</Example>

			<Example title="Disabled">
				<Field>
					<Label>Disabled</Label>
					<SearchInput disabled placeholder={placeholder} />
				</Field>
			</Example>
		</>
	)
}
