import { Field, Fieldset, Label, Legend } from '../../../../components/fieldset'
import { Input } from '../../../../components/input'
import { Stack } from '../../../../components/stack'
import { Example } from '../../../engine'

export function Demo() {
	return (
		<Stack gap="xl">
			<Example title="Captioning a group">
				<Fieldset>
					<Legend>Shipping address</Legend>
					<Stack gap="lg">
						<Field>
							<Label>Street</Label>
							<Input placeholder="123 Main St" />
						</Field>
						<Field>
							<Label>City</Label>
							<Input placeholder="Springfield" />
						</Field>
					</Stack>
				</Fieldset>
			</Example>
		</Stack>
	)
}
