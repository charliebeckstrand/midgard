import { Card } from 'ui/card'
import { Flex } from 'ui/flex'

export default function AlignAndJustify() {
	return (
		<Card>
			<Flex gap="md" justify="between" align="center">
				<Card>Start</Card>
				<Card>Middle</Card>
				<Card>End</Card>
			</Flex>
		</Card>
	)
}
