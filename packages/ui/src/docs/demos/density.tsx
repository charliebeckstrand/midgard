'use client'

import { useState } from 'react'
import { Button } from '../../components/button'
import { Field, Label } from '../../components/fieldset'
import { Input } from '../../components/input'
import { Listbox, ListboxLabel, ListboxOption } from '../../components/listbox'
import { Stack } from '../../components/stack'
import { Textarea } from '../../components/textarea'
import { Density, type DensityLevel } from '../../providers/density'
import { Example } from '../components/example'

export const meta = { category: 'Providers' }

const levels: { value: DensityLevel; label: string }[] = [
	{ value: 'loose', label: 'Loose' },
	{ value: 'snug', label: 'Snug' },
	{ value: 'compact', label: 'Compact' },
]

export default function DensityDemo() {
	const [density, setDensity] = useState<DensityLevel>('snug')

	return (
		<Stack gap="xl">
			<Example
				title="Default"
				actions={
					<Listbox<DensityLevel>
						value={density}
						onValueChange={(value) => value && setDensity(value)}
						displayValue={(v) => levels.find((t) => t.value === v)?.label ?? v}
						placeholder="Select density"
					>
						{levels.map((level) => (
							<ListboxOption key={level.value} value={level.value}>
								<ListboxLabel>{level.label}</ListboxLabel>
							</ListboxOption>
						))}
					</Listbox>
				}
			>
				<Stack gap="lg">
					<Density density={density}>
						<Stack>
							<Field>
								<Label>Email</Label>
								<Input placeholder="you@example.com" />
							</Field>
							<Field>
								<Label>Bio</Label>
								<Textarea placeholder="Tell us about yourself" />
							</Field>
							<Button color="blue">Save</Button>
						</Stack>
					</Density>
				</Stack>
			</Example>
		</Stack>
	)
}
