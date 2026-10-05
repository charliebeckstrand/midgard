import { Card } from 'ui/card'
import { Flex } from 'ui/flex'

export default function ResponsiveDirection() {
	return (
		<Flex direction={{ initial: 'col', md: 'row' }} gap="md">
			<Card>One</Card>
			<Card>Two</Card>
			<Card>Three</Card>
		</Flex>
	)
}
