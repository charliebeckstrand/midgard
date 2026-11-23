import { Card } from 'ui/card'
import { Columns, ColumnsItem } from 'ui/columns'

export default function Spanning() {
	return (
		<Columns columns={{ initial: 1, sm: 2, lg: 3 }}>
			<Card>One</Card>
			<Card>Two</Card>
			<Card>Three</Card>
			<ColumnsItem span="full">
				<Card>The whole row at each width</Card>
			</ColumnsItem>
			<ColumnsItem span={{ initial: 'full', lg: 2 }}>
				<Card>The whole row, then two columns from lg</Card>
			</ColumnsItem>
			<Card>Four</Card>
		</Columns>
	)
}
