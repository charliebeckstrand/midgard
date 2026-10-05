import { Card } from 'ui/card'
import { Stack } from 'ui/stack'

export default function Column() {
	return (
		<Stack gap="md">
			<Card>One</Card>
			<Card>Two</Card>
			<Card>Three</Card>
		</Stack>
	)
}
