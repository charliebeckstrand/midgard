'use client'

import { useState } from 'react'
import { Field, Label } from '../../components/fieldset'
import { Glass } from '../../components/glass'
import { NumberInput } from '../../components/number-input'
import { Sizer } from '../../components/sizer'
import { Stack } from '../../components/stack'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Forms' }

function Controlled() {
	const [value, setValue] = useState<number | undefined>(3)

	return (
		<Example
			title="Controlled"
			code={code`
				import { useState } from 'react'
				import { NumberInput } from 'ui/number-input'

				const [value, setValue] = useState<number | undefined>(3)

				<NumberInput value={value} onChange={setValue} min={0} max={10} />
			`}
		>
			<Sizer>
				<Field>
					<Label>Quantity</Label>
					<NumberInput value={value} onChange={setValue} min={0} max={10} />
				</Field>
			</Sizer>
		</Example>
	)
}

export default function NumberInputDemo() {
	return (
		<Stack gap={8}>
			<Example title="Variants">
				<Sizer>
					<Field>
						<Label htmlFor="num-default">Default</Label>
						<NumberInput id="num-default" defaultValue={1} />
					</Field>
					<Field>
						<Label>Outline</Label>
						<NumberInput variant="outline" defaultValue={1} />
					</Field>
					<Glass>
						<Field>
							<Label>Glass</Label>
							<NumberInput defaultValue={1} />
						</Field>
					</Glass>
				</Sizer>
			</Example>

			<Example title="Sizes">
				<Sizer size="sm">
					<Field>
						<Label>Small</Label>
						<NumberInput size="sm" defaultValue={1} />
					</Field>
				</Sizer>
				<Sizer size="md">
					<Field>
						<Label>Medium</Label>
						<NumberInput size="md" defaultValue={1} />
					</Field>
				</Sizer>
				<Sizer size="lg">
					<Field>
						<Label>Large</Label>
						<NumberInput size="lg" defaultValue={1} />
					</Field>
				</Sizer>
			</Example>

			<Controlled />

			<Example title="Disabled">
				<Sizer>
					<Field>
						<Label>Disabled</Label>
						<NumberInput disabled defaultValue={1} />
					</Field>
				</Sizer>
			</Example>

			<Example title="Invalid">
				<Sizer>
					<Field>
						<Label>Invalid</Label>
						<NumberInput data-invalid defaultValue={1} />
					</Field>
				</Sizer>
			</Example>

			<Example title="Valid">
				<Sizer>
					<Field>
						<Label>Valid</Label>
						<NumberInput data-valid defaultValue={1} />
					</Field>
				</Sizer>
			</Example>
		</Stack>
	)
}
