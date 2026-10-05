import { Button } from 'ui/button'
import { Card, CardBody, CardDescription, CardFooter, CardHeader, CardTitle } from 'ui/card'
import { Text } from 'ui/text'

export default function WithHeaderAndFooter() {
	return (
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
	)
}
