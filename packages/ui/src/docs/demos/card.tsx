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
import { Example } from '../components/example'

export const meta = { category: 'Layout' }

const variants = ['solid', 'outline'] as const

export default function CardDemo() {
	return (
		<div className="space-y-8">
			<Example title="Variants">
				<div className="grid gap-4 sm:grid-cols-2">
					{variants.map((variant) => (
						<Card key={variant} variant={variant}>
							<CardBody>
								<Text>{variant}</Text>
							</CardBody>
						</Card>
					))}
				</div>
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
