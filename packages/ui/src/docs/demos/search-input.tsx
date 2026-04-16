'use client'

import { useState } from 'react'
import { Field, Label } from '../../components/fieldset'
import { Glass } from '../../components/glass'
import { SearchInput } from '../../components/search-input'
import { Sizer } from '../../components/sizer'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Forms' }

const placeholder = 'Search'

function Controlled() {
	const [value, setValue] = useState('')

	return (
		<Example title="Controlled with clear">
			<Sizer>
				<Field>
					<Label>Search</Label>
					<SearchInput
						value={value}
						onChange={(e) => setValue(e.target.value)}
						onClear={() => setValue('')}
						placeholder={placeholder}
					/>
				</Field>
			</Sizer>
		</Example>
	)
}

export default function SearchInputDemo() {
	return (
		<Stack gap={6}>
			<Example title="Default">
				<Sizer>
					<Field>
						<Label>Search</Label>
						<SearchInput placeholder={placeholder} />
					</Field>
				</Sizer>
			</Example>

			<Example title="Variants">
				<Sizer>
					<Field>
						<Label>Default</Label>
						<SearchInput placeholder={placeholder} />
					</Field>
					<Field>
						<Label>Outline</Label>
						<SearchInput variant="outline" placeholder={placeholder} />
					</Field>
					<Glass>
						<Field>
							<Label>Glass</Label>
							<SearchInput placeholder={placeholder} />
						</Field>
					</Glass>
				</Sizer>
			</Example>

			<Example title="Sizes">
				<Sizer size="sm">
					<Field>
						<Label>Small</Label>
						<SearchInput size="sm" placeholder={placeholder} />
					</Field>
				</Sizer>
				<Sizer size="md">
					<Field>
						<Label>Medium</Label>
						<SearchInput size="md" placeholder={placeholder} />
					</Field>
				</Sizer>
				<Sizer size="lg">
					<Field>
						<Label>Large</Label>
						<SearchInput size="lg" placeholder={placeholder} />
					</Field>
				</Sizer>
			</Example>

			<Controlled />

			<Example title="Loading">
				<Sizer>
					<Field>
						<Label>Loading</Label>
						<SearchInput loading placeholder="Searching..." />
					</Field>
				</Sizer>
			</Example>

			<Example title="Disabled">
				<Sizer>
					<Field>
						<Label>Disabled</Label>
						<SearchInput disabled placeholder={placeholder} />
					</Field>
				</Sizer>
			</Example>
		</Stack>
	)
}
