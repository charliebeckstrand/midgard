import { Card } from 'ui/card'
import { Flex } from 'ui/flex'

export default function Equal() {
	return (
		<Flex gap="md" className="*:flex-1">
			<Card>Narrow</Card>
			<Card>Wider content here</Card>
			<Card>Even wider content in this card</Card>
		</Flex>
	)
}
