import { Card } from '../../components/card'
import { Container } from '../../components/container'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Layout' }

export default function ContainerDemo() {
	return (
		<div className="space-y-8">
			<Example
				title="Default"
				code={code`
					import { Container } from 'ui/container'

					<Container>
						<Card>Page content</Card>
					</Container>
				`}
			>
				<Container>
					<Card>Page content</Card>
				</Container>
			</Example>

			<Example
				title="Padding"
				code={code`
					import { Container } from 'ui/container'

					<Container padding="none"><Card>No padding</Card></Container>
					<Container padding="sm"><Card>Small padding</Card></Container>
					<Container padding="lg"><Card>Large padding</Card></Container>
				`}
			>
				<div className="space-y-3">
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
				</div>
			</Example>
		</div>
	)
}
