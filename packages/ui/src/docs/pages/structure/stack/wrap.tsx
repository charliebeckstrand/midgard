import { Badge } from 'ui/badge'
import { Stack } from 'ui/stack'

export default function Wrap() {
	return (
		<div className="h-32">
			<Stack gap="sm" wrap className="h-full">
				<Badge>design</Badge>
				<Badge>engineering</Badge>
				<Badge>product</Badge>
				<Badge>research</Badge>
				<Badge>operations</Badge>
				<Badge>marketing</Badge>
				<Badge>support</Badge>
			</Stack>
		</div>
	)
}
