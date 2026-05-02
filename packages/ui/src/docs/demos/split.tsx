import { Card } from '../../components/card'
import { Split } from '../../components/split'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Layout' }

export default function SplitDemo() {
	return (
		<Stack gap="xl">
			<Example title="Equal split">
				<Split>
					<Card>Left</Card>
					<Card>Right</Card>
				</Split>
			</Example>

			<Example title="Sidebar layout">
				<Split ratio="1/3" gap="xl">
					<Card>
						<div className="line-clamp-1">Sidebar (1/3)</div>
					</Card>
					<Card>
						<div className="line-clamp-1">Main content (2/3)</div>
					</Card>
				</Split>
			</Example>

			<Example title="Vertical">
				<Split direction="vertical" ratio="1/4" className="h-72">
					<Card>Header (1/4)</Card>
					<Card>Body (3/4)</Card>
				</Split>
			</Example>
		</Stack>
	)
}
