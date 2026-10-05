import { Card } from 'ui/card'
import { Split } from 'ui/split'

export default function Vertical() {
	return (
		<Split orientation="vertical" ratio="1/4" className="h-72">
			<Card>Header (1/4)</Card>
			<Card>Body (3/4)</Card>
		</Split>
	)
}
