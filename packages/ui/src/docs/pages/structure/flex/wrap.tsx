import { Badge } from 'ui/badge'
import { Flex } from 'ui/flex'

export default function Wrap() {
	return (
		<div className="w-64">
			<Flex gap="sm" wrap>
				<Badge>design</Badge>
				<Badge>engineering</Badge>
				<Badge>product</Badge>
				<Badge>research</Badge>
				<Badge>operations</Badge>
				<Badge>marketing</Badge>
				<Badge>support</Badge>
			</Flex>
		</div>
	)
}
