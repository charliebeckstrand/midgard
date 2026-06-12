import { Card } from '../../components/card'
import { Container } from '../../components/container'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export function Demo() {
	return (
		<>
			<Example title="Default">
				<Container>
					<Card>Page content</Card>
				</Container>
			</Example>

			<Example title="Padding">
				<Stack gap="lg">
					<Container padding="none">
						<Card>No padding</Card>
					</Container>
					<Container padding="sm">
						<Card>Small padding</Card>
					</Container>
					<Container padding="md">
						<Card>Medium padding</Card>
					</Container>
					<Container padding="lg">
						<Card>Large padding</Card>
					</Container>
				</Stack>
			</Example>
		</>
	)
}
