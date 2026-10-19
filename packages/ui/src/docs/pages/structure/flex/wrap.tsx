import { Badge } from 'ui/badge'
import { Flex } from 'ui/flex'

export default function Wrap() {
	return (
		<div className="w-64">
			<Flex gap="sm" wrap>
				<Badge>Design</Badge>
				<Badge>Engineering</Badge>
				<Badge>Product</Badge>
				<Badge>Research</Badge>
				<Badge>Operations</Badge>
				<Badge>Marketing</Badge>
				<Badge>Support</Badge>
			</Flex>
		</div>
	)
}
