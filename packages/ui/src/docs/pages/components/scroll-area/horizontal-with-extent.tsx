import { Badge } from 'ui/badge'
import { Flex } from 'ui/flex'
import { ScrollArea } from 'ui/scroll-area'

const tags = [
	'Design',
	'Engineering',
	'Marketing',
	'Sales',
	'Support',
	'Finance',
	'Legal',
	'Operations',
	'Research',
	'Product',
	'Security',
	'People',
]

export default function HorizontalWithExtent() {
	return (
		<ScrollArea orientation="horizontal" extent="md" rounded>
			<Flex gap="sm" className="w-max">
				{tags.map((tag) => (
					<Badge key={tag}>{tag}</Badge>
				))}
			</Flex>
		</ScrollArea>
	)
}
