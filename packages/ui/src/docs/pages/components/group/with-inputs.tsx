import { Group } from 'ui/group'
import { Input } from 'ui/input'
import { Stack } from 'ui/stack'

export default function WithInputs() {
	return (
		<Stack gap="lg">
			<Group>
				<Input placeholder="First" />
				<Input placeholder="Second" />
				<Input placeholder="Third" />
			</Group>
			<Group>
				<Input placeholder="First" />
				<Input placeholder="Last" />
			</Group>
			<Group>
				<Input placeholder="Only one" />
			</Group>
		</Stack>
	)
}
