import { Card } from 'ui/card'
import { Flex } from 'ui/flex'

export default function Row() {
	return (
		<Flex gap="md">
			<Card>One</Card>
			<Card>Two</Card>
			<Card>Three</Card>
		</Flex>
	)
}
