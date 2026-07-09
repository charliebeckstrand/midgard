import { Description, Field, Label } from '../../../../components/fieldset'
import { Input } from '../../../../components/input'
import { Stack } from '../../../../components/stack'
import { Example } from '../../../engine'

export function Demo() {
	return (
		<Stack gap="xl">
			<Example title="Help text">
				<Field>
					<Label>Email</Label>
					<Description>We'll use this for account notifications.</Description>
					<Input type="email" placeholder="jane@example.com" />
				</Field>
			</Example>
		</Stack>
	)
}
