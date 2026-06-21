import { useState } from 'react'
import { Field, Label } from '../../components/fieldset'
import { NumberInput } from '../../components/number-input'
import { Example } from '../components/example'

function ControlledExample() {
	const [value, setValue] = useState<number | undefined>(3)

	return (
		<Example title="Controlled">
			<Field>
				<Label>Quantity</Label>
				<NumberInput value={value} onValueChange={setValue} min={0} max={10} />
			</Field>
		</Example>
	)
}

export function Demo() {
	return (
		<>
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

			<ControlledExample />

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

			<Example title="Warning">
				<Field>
					<Label>Warning</Label>
					<NumberInput data-warning defaultValue={1} />
				</Field>
			</Example>
		</>
	)
}
