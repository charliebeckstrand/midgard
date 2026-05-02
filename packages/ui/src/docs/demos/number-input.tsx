'use client'

import { useState } from 'react'
import { Field, Label } from '../../components/fieldset'
import { NumberInput } from '../../components/number-input'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Input' }

function Controlled() {
	const [value, setValue] = useState<number | undefined>(3)

	return (
		<Example title="Controlled">
			<Field>
				<Label>Quantity</Label>
				<NumberInput value={value} onChange={setValue} min={0} max={10} />
			</Field>
		</Example>
	)
}

export default function NumberInputDemo() {
	return (
		<Stack gap="xl">
			<Example title="Variants">
				<Field>
					<Label htmlFor="num-default">Default</Label>
					<NumberInput id="num-default" defaultValue={1} />
				</Field>
				<Field>
					<Label>Outline</Label>
					<NumberInput variant="outline" defaultValue={1} />
				</Field>
			</Example>

			<Example title="Sizes">
				<Field>
					<Label>Small</Label>
					<NumberInput size="sm" defaultValue={1} />
				</Field>
				<Field>
					<Label>Medium</Label>
					<NumberInput size="md" defaultValue={1} />
				</Field>
				<Field>
					<Label>Large</Label>
					<NumberInput size="lg" defaultValue={1} />
				</Field>
			</Example>

			<Controlled />

			<Example title="Disabled">
				<Field>
					<Label>Disabled</Label>
					<NumberInput disabled defaultValue={1} />
				</Field>
			</Example>

			<Example title="Invalid">
				<Field>
					<Label>Invalid</Label>
					<NumberInput data-invalid defaultValue={1} />
				</Field>
			</Example>

			<Example title="Valid">
				<Field>
					<Label>Valid</Label>
					<NumberInput data-valid defaultValue={1} />
				</Field>
			</Example>
		</Stack>
	)
}
