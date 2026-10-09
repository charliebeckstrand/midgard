import { Group } from 'ui/group'
import { Input } from 'ui/input'
import { Stack } from 'ui/stack'

export default function WithInputs() {
	return (
		<Stack gap="lg">
			<Group>
				<Input aria-label="First" placeholder="First" />
				<Input aria-label="Second" placeholder="Second" />
				<Input aria-label="Third" placeholder="Third" />
			</Group>
			<Group>
				<Input aria-label="First" placeholder="First" />
				<Input aria-label="Last" placeholder="Last" />
			</Group>
			<Group>
				<Input aria-label="Only one" placeholder="Only one" />
			</Group>
		</Stack>
	)
}
