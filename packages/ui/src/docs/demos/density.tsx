'use client'

import { useState } from 'react'
import { Button } from '../../components/button'
import { Field, Label } from '../../components/fieldset'
import { Input } from '../../components/input'
import { Listbox, ListboxLabel, ListboxOption } from '../../components/listbox'
import { Stack } from '../../components/stack'
import { Textarea } from '../../components/textarea'
import { Density, type DensityTier } from '../../providers'
import { Example } from '../components/example'

export const meta = { category: 'Providers' }

const tiers: { value: DensityTier; label: string }[] = [
	{ value: 'comfortable', label: 'Comfortable' },
	{ value: 'snug', label: 'Snug' },
	{ value: 'compact', label: 'Compact' },
]

export default function DensityDemo() {
	const [density, setDensity] = useState<DensityTier>('snug')

	return (
		<Stack gap="xl">
			<Example title="Density selector">
				<Stack gap="lg">
					<Field>
						<Label>Density</Label>
						<Listbox<DensityTier>
							value={density}
							onValueChange={(value) => value && setDensity(value)}
							displayValue={(v) => tiers.find((t) => t.value === v)?.label ?? v}
							placeholder="Select density"
						>
							{tiers.map((tier) => (
								<ListboxOption key={tier.value} value={tier.value}>
									<ListboxLabel>{tier.label}</ListboxLabel>
								</ListboxOption>
							))}
						</Listbox>
					</Field>

					<Density density={density}>
						<Stack gap="md">
							<Field>
								<Label>Email</Label>
								<Input placeholder="you@example.com" />
							</Field>
							<Field>
								<Label>Bio</Label>
								<Textarea placeholder="Tell us about yourself" />
							</Field>
							<Button>Save</Button>
						</Stack>
					</Density>
				</Stack>
			</Example>
		</Stack>
	)
}
