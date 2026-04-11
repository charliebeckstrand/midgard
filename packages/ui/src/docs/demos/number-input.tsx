'use client'

import { useState } from 'react'
import { Field, Label } from '../../components/fieldset'
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
			<Example title="Default">
				<Field className="lg:max-w-sm">
					<Label htmlFor="num-default">Quantity</Label>
					<NumberInput id="num-default" defaultValue={1} />
				</Field>
			</Example>

			<Controlled />

			<Example title="Min, max, and step">
				<div className="flex lg:max-w-sm flex-col gap-4">
					<Field>
						<Label>Step 5 (0–100)</Label>
						<NumberInput defaultValue={0} min={0} max={100} step={5} />
					</Field>
					<Field>
						<Label>Step 0.1 (0–1)</Label>
						<NumberInput defaultValue={0.5} min={0} max={1} step={0.1} />
					</Field>
					<Field>
						<Label>Signed (−50 to 50)</Label>
						<NumberInput defaultValue={0} min={-50} max={50} />
					</Field>
				</div>
			</Example>

			<Example title="Sizes">
				<div className="flex flex-col gap-4">
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
				</div>
			</Example>

			<Example title="Outline">
				<Field className="lg:max-w-sm">
					<Label>Outline</Label>
					<NumberInput variant="outline" defaultValue={1} />
				</Field>
			</Example>

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
		</div>
	)
}
