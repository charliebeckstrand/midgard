import { Card } from '../../components/card'
import { Container } from '../../components/container'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Layout' }

export default function ContainerDemo() {
	return (
		<Stack gap={6}>
			<Example title="Default">
				<Container>
					<Card>Page content</Card>
				</Container>
			</Example>

			<Example title="Padding">
				<Stack gap={4}>
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
		</Stack>
	)
}
