import { Group } from 'ui/group'
import { Input } from 'ui/input'
import { Stack } from 'ui/stack'

export default function WithInputs() {
	return (
		<Stack gap="lg">
			<Group>
				<Input aria-label="Street" placeholder="Street" />
				<Input aria-label="City" placeholder="City" />
				<Input aria-label="Postal code" placeholder="Postal code" />
			</Group>
			<Group>
				<Input aria-label="First name" placeholder="First name" />
				<Input aria-label="Last name" placeholder="Last name" />
			</Group>
			<Group>
				<Input aria-label="Email" placeholder="Email" />
			</Group>
		</Stack>
	)
}
