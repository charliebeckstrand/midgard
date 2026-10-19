import { Badge } from 'ui/badge'
import { Stack } from 'ui/stack'

export default function Wrap() {
	return (
		<div className="h-32">
			<Stack gap="sm" wrap className="h-full">
				<Badge>Design</Badge>
				<Badge>Engineering</Badge>
				<Badge>Product</Badge>
				<Badge>Research</Badge>
				<Badge>Operations</Badge>
				<Badge>Marketing</Badge>
				<Badge>Support</Badge>
			</Stack>
		</div>
	)
}
