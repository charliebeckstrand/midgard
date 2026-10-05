import { Button } from 'ui/button'
import { Card, CardBody, CardDescription, CardHeader, type CardProps, CardTitle } from 'ui/card'

export default function CardPlayground(props: CardProps) {
	return (
		<Card {...props}>
			<CardHeader>
				<CardTitle>Project settings</CardTitle>
				<CardDescription>Manage your project configuration.</CardDescription>
			</CardHeader>
			<CardBody>
				<Button>Save</Button>
			</CardBody>
		</Card>
	)
}
