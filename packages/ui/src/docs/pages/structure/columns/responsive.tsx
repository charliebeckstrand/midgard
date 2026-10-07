import { Card } from 'ui/card'
import { Columns } from 'ui/columns'

export default function Responsive() {
	return (
		<Columns columns={{ initial: 1, sm: 2, lg: 4 }}>
			<Card>One</Card>
			<Card>Two</Card>
			<Card>Three</Card>
			<Card>Four</Card>
		</Columns>
	)
}
