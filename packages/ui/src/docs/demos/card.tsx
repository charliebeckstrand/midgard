import { Alert, AlertDescription, AlertTitle } from '../../components/alert'
import { Badge } from '../../components/badge'
import { Button } from '../../components/button'
import {
	Card,
	CardBody,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '../../components/card'
import { Text } from '../../components/text'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Layout' }

export default function CardDemo() {
	return (
		<div className="space-y-8">
			<Alert type="info" closable>
				<AlertTitle>Box</AlertTitle>
				<AlertDescription>The Card component extends the Box component.</AlertDescription>
				<Text className="py-2">
					See the{' '}
					<a href="#box" className="underline underline-offset-4">
						Box documentation
					</a>{' '}
					for more details and examples of the Box API.
				</Text>
			</Alert>

			<Example
				title="Default"
				code={code`
					import { Card } from 'ui/card'

					<Card>Content</Card>
				`}
			>
				<Card>Content</Card>
			</Example>

			{/* <Example
				title="Box API"
				code={code`
					import { Card } from 'ui/card'

					<Card p={4} radius="lg" bg="tint">Tint</Card>
					<Card p={4} radius="lg" bg="surface">Surface</Card>
					<Card p={4} radius="lg" bg="none">Outline</Card>
				`}
			>
				<div className="space-y-4">
					<Alert type="info" closable>
						<AlertTitle>Box API</AlertTitle>
						<AlertDescription>
							The Card component extends the Box component, so you can use all of the Box props to
							customize it.
						</AlertDescription>
					</Alert>

					<div className="grid gap-4 sm:grid-cols-3">
						<Card p={4} radius="lg" bg="tint">
							Tint
						</Card>
						<Card p={4} radius="lg" bg="surface">
							Surface
						</Card>
						<Card p={4} radius="lg" bg="none">
							Outline
						</Card>
					</div>
				</div>
			</Example> */}

			<Example title="With header and footer">
				<Card>
					<CardHeader>
						<CardTitle>Project settings</CardTitle>
						<CardDescription>Manage your project configuration.</CardDescription>
					</CardHeader>
					<CardBody>
						<Text>Configure your project name, description, and visibility.</Text>
					</CardBody>
					<CardFooter>
						<Button color="blue">Save changes</Button>
						<Button variant="plain">Cancel</Button>
					</CardFooter>
				</Card>
			</Example>

			<Example title="Composing with other components">
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<CardTitle>Deployment</CardTitle>
							<Badge color="green">Active</Badge>
						</div>
					</CardHeader>
					<CardBody>
						<Text>Last deployed 3 minutes ago to production.</Text>
					</CardBody>
					<CardFooter>
						<Button variant="plain">View logs</Button>
					</CardFooter>
				</Card>
			</Example>
		</div>
	)
}
