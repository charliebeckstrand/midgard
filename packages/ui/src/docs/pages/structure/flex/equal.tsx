import { Card } from 'ui/card'
import { Flex } from 'ui/flex'

export default function Equal() {
	return (
		<Flex gap="md" className="*:flex-1">
			<Card>To do</Card>
			<Card>In progress</Card>
			<Card>Waiting for review by the design team</Card>
		</Flex>
	)
}
