import { useState } from 'react'
import { Field, Label } from '../../../components/fieldset'
import { ZipcodeInput } from '../../../components/zipcode-input'
import { Example } from '../../engine'

function ControlledExample() {
	const [value, setValue] = useState('')

	return (
		<Example title="Controlled">
			<Field>
				<Label>ZIP</Label>
				<ZipcodeInput value={value} onValueChange={setValue} />
			</Field>
		</Example>
	)
}

export function Demo() {
	return (
		<>
			<Example title="US">
				<Field>
					<Label>ZIP</Label>
					<ZipcodeInput country="US" />
				</Field>
			</Example>

			<Example title="Canada">
				<Field>
					<Label>Postal code</Label>
					<ZipcodeInput country="CA" />
				</Field>
			</Example>

			<Example title="United Kingdom">
				<Field>
					<Label>Postcode</Label>
					<ZipcodeInput country="GB" />
				</Field>
			</Example>

			<Example title="International">
				<Field>
					<Label>Postal code</Label>
					<ZipcodeInput country="international" placeholder="Postal code" />
				</Field>
			</Example>

			<Example title="Sizes">
				<Field>
					<Label>Small</Label>
					<ZipcodeInput size="sm" />
				</Field>
				<Field>
					<Label>Medium</Label>
					<ZipcodeInput size="md" />
				</Field>
				<Field>
					<Label>Large</Label>
					<ZipcodeInput size="lg" />
				</Field>
			</Example>

			<ControlledExample />

			<Example title="Disabled">
				<Field>
					<Label>Disabled</Label>
					<ZipcodeInput disabled defaultValue="94103" />
				</Field>
			</Example>

			<Example title="Invalid">
				<Field>
					<Label>Invalid</Label>
					<ZipcodeInput data-invalid />
				</Field>
			</Example>
		</>
	)
}
