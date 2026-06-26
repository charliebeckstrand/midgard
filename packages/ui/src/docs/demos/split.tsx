import { Card } from '../../components/card'
import { Split } from '../../components/split'
import { Example } from '../engine'

export function Demo() {
	return (
		<>
			<Example title="Equal split">
				<Split>
					<Card>Left</Card>
					<Card>Right</Card>
				</Split>
			</Example>

			<Example title="Sidebar layout">
				<Split ratio="1/3">
					<Card>
						<div className="line-clamp-1">Sidebar (1/3)</div>
					</Card>
					<Card>
						<div className="line-clamp-1">Main content (2/3)</div>
					</Card>
				</Split>
			</Example>

			<Example title="Vertical">
				<Split orientation="vertical" ratio="1/4" className="h-72">
					<Card>Header (1/4)</Card>
					<Card>Body (3/4)</Card>
				</Split>
			</Example>
		</>
	)
}
