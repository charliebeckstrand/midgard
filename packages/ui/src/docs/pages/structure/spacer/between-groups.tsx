import { Button } from 'ui/button'
import { Card } from 'ui/card'
import { Flex } from 'ui/flex'
import { Spacer } from 'ui/spacer'

export default function BetweenGroups() {
	return (
		<Card>
			<Flex gap="md" align="center">
				<Button variant="plain">Back</Button>
				<Spacer />
				<Button variant="plain">Cancel</Button>
				<Button>Save</Button>
			</Flex>
		</Card>
	)
}
