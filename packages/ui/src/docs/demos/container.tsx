import { Card } from '../../components/card'
import { Container } from '../../components/container'
import { Stack } from '../../components/stack'
import { Example } from '../engine'

export function Demo() {
	return (
		<Example title="Padding">
			<Stack gap="lg">
				<Container padding="none">
					<Card bg="tint">No padding</Card>
				</Container>
				<Container padding="sm">
					<Card bg="tint">Small padding</Card>
				</Container>
				<Container padding="md">
					<Card bg="tint">Medium padding</Card>
				</Container>
				<Container padding="lg">
					<Card bg="tint">Large padding</Card>
				</Container>
			</Stack>
		</Example>
	)
}
