import { useState } from 'react'
import { Field, Label } from '../../../components/fieldset'
import { NumberInput } from '../../../components/number-input'
import { Text } from '../../../components/text'
import { Axes, Example } from '../../engine'

export const meta = { category: 'input' }

function ControlledExample() {
	const [value, setValue] = useState<number | null>(3)

	return (
		<Example title="Controlled">
			<Field>
				<Label>Quantity</Label>
				<NumberInput value={value} onValueChange={setValue} min={0} max={10} />
			</Field>
			<Text className="tabular-nums">{value ?? 'Empty'}</Text>
		</Example>
	)
}

export function Demo() {
	return (
		<>
			<Axes
				of="NumberInput"
				captions={false}
				render={(props, label) => <NumberInput {...props} aria-label={label} placeholder={label} />}
			/>

			<ControlledExample />

			<Example title="Disabled">
				<Field>
					<Label>Disabled</Label>
					<NumberInput disabled defaultValue={1} />
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
