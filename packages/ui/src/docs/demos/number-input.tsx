'use client'

import { useState } from 'react'
import { Field, Label } from '../../components/fieldset'
import { Glass } from '../../components/glass'
import { NumberInput } from '../../components/number-input'
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
			<Field className="lg:max-w-sm">
				<Label>Quantity</Label>
				<NumberInput value={value} onChange={setValue} min={0} max={10} />
			</Field>
		</Example>
	)
}

export default function NumberInputDemo() {
	return (
		<div className="space-y-8">
			<Example title="Variants">
				<div className="lg:max-w-sm flex flex-col gap-4">
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
				</div>
			</Example>

			<Example title="Sizes">
				<div className="lg:max-w-xs">
					<Field>
						<Label>Small</Label>
						<NumberInput size="sm" defaultValue={1} />
					</Field>
				</div>
				<div className="lg:max-w-sm">
					<Field>
						<Label>Medium</Label>
						<NumberInput size="md" defaultValue={1} />
					</Field>
				</div>
				<div className="lg:max-w-md">
					<Field>
						<Label>Large</Label>
						<NumberInput size="lg" defaultValue={1} />
					</Field>
				</div>
			</Example>

			<Controlled />

			<Example title="Disabled">
				<Field className="lg:max-w-sm">
					<Label>Disabled</Label>
					<NumberInput disabled defaultValue={1} />
				</Field>
			</Example>

			<Example title="Invalid">
				<Field className="lg:max-w-sm">
					<Label>Invalid</Label>
					<NumberInput data-invalid defaultValue={1} />
				</Field>
			</Example>

			<Example title="Valid">
				<Field className="lg:max-w-sm">
					<Label>Valid</Label>
					<NumberInput data-valid defaultValue={1} />
				</Field>
			</Example>
		</div>
	)
}
