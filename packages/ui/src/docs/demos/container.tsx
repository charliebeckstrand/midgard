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
				title="Sizes"
				code={code`
					import { Container } from 'ui/container'

					<Container size="sm"><Card>sm — reading width</Card></Container>
					<Container size="md"><Card>md — content area</Card></Container>
					<Container size="lg"><Card>lg — wide content</Card></Container>
					<Container size="xl"><Card>xl — full page</Card></Container>
				`}
			>
				<div className="space-y-3">
					<Container size="sm">
						<Card>sm — reading width</Card>
					</Container>
					<Container size="md">
						<Card>md — content area</Card>
					</Container>
					<Container size="lg">
						<Card>lg — wide content</Card>
					</Container>
					<Container size="xl">
						<Card>xl — full page</Card>
					</Container>
				</div>
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
					<Container padding="lg">
						<Card>Large padding</Card>
					</Container>
				</div>
			</Example>
		</div>
	)
}
