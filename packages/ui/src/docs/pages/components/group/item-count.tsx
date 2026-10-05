import { Button } from 'ui/button'
import { Group } from 'ui/group'
import { Stack } from 'ui/stack'

export default function ItemCount() {
	return (
		<Stack gap="lg">
			<Group>
				<Button variant="outline">Cut</Button>
				<Button variant="outline">Copy</Button>
				<Button variant="outline">Paste</Button>
			</Group>
			<Group>
				<Button variant="outline">Previous</Button>
				<Button variant="outline">Next</Button>
			</Group>
			<Group>
				<Button variant="outline">Only one</Button>
			</Group>
		</Stack>
	)
}
