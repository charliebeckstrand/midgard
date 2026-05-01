import { Alert, AlertDescription } from '../../components/alert'
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
import { Flex } from '../../components/flex'
import { Stack } from '../../components/stack'
import { Text } from '../../components/text'
import { Example } from '../components/example'

export const meta = { category: 'Layout' }

export default function CardDemo() {
	return (
		<Stack gap={6}>
			<Alert type="info" closable>
				<AlertDescription>Card extends Box.</AlertDescription>
				<AlertDescription>
					See the{' '}
					<a href="#box" className="text-white underline underline-offset-4">
						Box documentation
					</a>{' '}
					for more details and examples.
				</AlertDescription>
			</Alert>

			<Example title="Default">
				<Card p={4}>Content</Card>
			</Example>

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
						<Flex justify="between">
							<CardTitle>Deployment</CardTitle>
							<Badge color="green">Active</Badge>
						</Flex>
					</CardHeader>
					<CardBody>
						<Text>Last deployed 3 minutes ago to production.</Text>
					</CardBody>
					<CardFooter>
						<Button variant="plain">View logs</Button>
					</CardFooter>
				</Card>
			</Example>

			<Example title="Sizes — concentric corners scale with padding">
				<Stack gap={4}>
					<Card size="sm">
						<CardHeader>
							<CardTitle>Small</CardTitle>
							<CardDescription>Tighter padding, sharper inner radius.</CardDescription>
						</CardHeader>
						<CardBody>
							<Button>Inherits sm</Button>
						</CardBody>
					</Card>
					<Card size="md">
						<CardHeader>
							<CardTitle>Medium (default)</CardTitle>
							<CardDescription>Balanced padding and radius.</CardDescription>
						</CardHeader>
						<CardBody>
							<Button>Inherits md</Button>
						</CardBody>
					</Card>
					<Card size="lg">
						<CardHeader>
							<CardTitle>Large</CardTitle>
							<CardDescription>Generous padding, softer inner radius.</CardDescription>
						</CardHeader>
						<CardBody>
							<Button>Inherits lg</Button>
						</CardBody>
					</Card>
				</Stack>
			</Example>
		</Stack>
	)
}
