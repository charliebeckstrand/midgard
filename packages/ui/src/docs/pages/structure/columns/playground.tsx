import { Card } from 'ui/card'
import { Columns, type ColumnsProps } from 'ui/columns'

export default function ColumnsPlayground(props: ColumnsProps) {
	return (
		<Columns columns={3} {...props}>
			<Card>One</Card>
			<Card>Two</Card>
			<Card>Three</Card>
			<Card>Four</Card>
			<Card>Five</Card>
			<Card>Six</Card>
		</Columns>
	)
}
