import { Alert } from '../../../components/alert'
import { Button } from '../../../components/button'
import {
	Card,
	CardBody,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '../../../components/card'
import { Link } from '../../../components/link'
import { Text } from '../../../components/text'
import { Axes, Example } from '../../engine'

export function Demo() {
	return (
		<>
			<Alert
				severity="info"
				closable
				title="Card extends Box."
				description={
					<>
						See the{' '}
						<Link href="#structure-box" underline>
							Box documentation
						</Link>{' '}
						for more details and examples.
					</>
				}
			/>

			<Axes
				of="Card"
				render={(props, label) => (
					<Card {...props} className="w-64">
						<CardHeader>
							<CardTitle>{label}</CardTitle>
							<CardDescription>Manage your project configuration.</CardDescription>
						</CardHeader>
						<CardBody>
							<Button>Save</Button>
						</CardBody>
					</Card>
				)}
			/>

			<Axes
				of="CardTitle"
				title="Card title"
				omit={['level']}
				render={(props, label) => (
					<Card className="w-64">
						<CardHeader>
							<CardTitle {...props}>{label}</CardTitle>
						</CardHeader>
					</Card>
				)}
			/>

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
		</>
	)
}
