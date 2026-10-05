import { Button } from 'ui/button'
import { Card } from 'ui/card'
import { Flex } from 'ui/flex'
import { Heading } from 'ui/heading'
import { Spacer, type SpacerProps } from 'ui/spacer'

export default function SpacerPlayground(props: SpacerProps) {
	return (
		<Card>
			<Flex align="center">
				<Heading level={3}>Title</Heading>
				<Spacer {...props} />
				<Button>Action</Button>
			</Flex>
		</Card>
	)
}
