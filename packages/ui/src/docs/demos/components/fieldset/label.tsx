import { Field, Label } from '../../../../components/fieldset'
import { Input } from '../../../../components/input'
import { Stack } from '../../../../components/stack'
import { Example } from '../../../engine'

export function Demo() {
	return (
		<Stack gap="xl">
			<Example title="Captioning a control">
				<Field>
					<Label>Full name</Label>
					<Input placeholder="Jane Smith" />
				</Field>
			</Example>
		</Stack>
	)
}
