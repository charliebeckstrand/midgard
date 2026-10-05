import { Card } from 'ui/card'
import { Flex } from 'ui/flex'

export default function Column() {
	return (
		<Flex direction="col" gap="md">
			<Card>One</Card>
			<Card>Two</Card>
			<Card>Three</Card>
		</Flex>
	)
}
