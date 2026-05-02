'use client'

import { useState } from 'react'
import { Field, Label } from '../../components/fieldset'
import { SearchInput } from '../../components/search-input'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Input' }

const placeholder = 'Search'

function Controlled() {
	const [value, setValue] = useState('')

	return (
		<Example title="Controlled with clear">
			<Field>
				<Label>Search</Label>
				<SearchInput
					value={value}
					onChange={(e) => setValue(e.target.value)}
					onClear={() => setValue('')}
					placeholder={placeholder}
				/>
			</Field>
		</Example>
	)
}

export default function SearchInputDemo() {
	return (
		<Stack gap="xl">
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

			<Controlled />

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
		</Stack>
	)
}
