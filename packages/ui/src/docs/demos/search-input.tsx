'use client'

import { useState } from 'react'
import { Field, Label } from '../../components/fieldset'
import { SearchInput } from '../../components/search-input'
import { Example } from '../components/example'

export const meta = { category: 'Input' }

const placeholder = 'Search'

function ControlledExample() {
	const [value, setValue] = useState('')

	return (
		<Field>
			<Label>Search</Label>
			<SearchInput
				value={value}
				onChange={(e) => setValue(e.target.value)}
				onClear={() => setValue('')}
				placeholder={placeholder}
			/>
		</Field>
	)
}

export function Demo() {
	return (
		<>
			<Example title="Default">
				<Field>
					<Label>Search</Label>
					<SearchInput placeholder={placeholder} />
				</Field>
			</Example>

			<Example title="Variants">
				<Field>
					<Label>Default</Label>
					<SearchInput placeholder={placeholder} />
				</Field>
				<Field>
					<Label>Outline</Label>
					<SearchInput variant="outline" placeholder={placeholder} />
				</Field>
			</Example>

			<Example title="Sizes">
				<Field>
					<Label>Small</Label>
					<SearchInput size="sm" placeholder={placeholder} />
				</Field>
				<Field>
					<Label>Medium</Label>
					<SearchInput size="md" placeholder={placeholder} />
				</Field>
				<Field>
					<Label>Large</Label>
					<SearchInput size="lg" placeholder={placeholder} />
				</Field>
			</Example>

			<Example title="Controlled with clear">
				<ControlledExample />
			</Example>

			<Example title="Loading">
				<Field>
					<Label>Loading</Label>
					<SearchInput loading placeholder="Searching..." />
				</Field>
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
