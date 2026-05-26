import { Alert, AlertDescription, AlertTitle } from '../../components/alert'
import { Button } from '../../components/button'
import {
	Card,
	CardBody,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '../../components/card'
import { Link } from '../../components/link'
import { Stack } from '../../components/stack'
import { Text } from '../../components/text'
import { Example } from '../components/example'

export const meta = { category: 'Layout' }

export function Demo() {
	return (
		<>
			<Alert severity="info" closable>
				<AlertTitle>Card extends Box.</AlertTitle>
				<AlertDescription>
					See the <Link href="#box">Box documentation</Link> for more details and examples.
				</AlertDescription>
			</Alert>

			<Example title="Default">
				<Card p="lg">Content</Card>
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

			<Example title="Sizes">
				<Stack gap="lg">
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
							<CardTitle>Medium</CardTitle>
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
		</>
	)
}
