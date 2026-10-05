import { Button } from 'ui/button'
import { Group, type GroupProps } from 'ui/group'

export default function GroupPlayground(props: GroupProps) {
	return (
		<Group {...props}>
			<Button variant="outline">Cut</Button>
			<Button variant="outline">Copy</Button>
			<Button variant="outline">Paste</Button>
		</Group>
	)
}
