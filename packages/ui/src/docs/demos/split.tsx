import { Card } from '../../components/card'
import { Split } from '../../components/split'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Layout' }

export default function SplitDemo() {
	return (
		<div className="space-y-8">
			<Example
				title="Equal split"
				code={code`
					import { Split } from 'ui/split'

					<Split>
						<Card>Left</Card>
						<Card>Right</Card>
					</Split>
				`}
			>
				<Split>
					<Card>Left</Card>
					<Card>Right</Card>
				</Split>
			</Example>

			<Example
				title="Sidebar layout"
				code={code`
					import { Split } from 'ui/split'

					<Split ratio="1/3" gap={6}>
						<Card>Sidebar (1/3)</Card>
						<Card>Main content (2/3)</Card>
					</Split>
				`}
			>
				<Split ratio="1/3" gap={6}>
					<Card>
						<div className="line-clamp-1">Sidebar (1/3)</div>
					</Card>
					<Card>
						<div className="line-clamp-1">Main content (2/3)</div>
					</Card>
				</Split>
			</Example>

			<Example
				title="Vertical"
				code={code`
					import { Split } from 'ui/split'

					<Split direction="vertical" ratio="1/4" className="h-48">
						<Card>Header</Card>
						<Card>Body</Card>
					</Split>
				`}
			>
				<Split direction="vertical" ratio="1/4" className="h-72">
					<Card>Header (1/4)</Card>
					<Card>Body (3/4)</Card>
				</Split>
			</Example>
		</div>
	)
}
