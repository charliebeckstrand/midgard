import { AspectRatio } from 'ui/aspect-ratio'
import { Card } from 'ui/card'
import { Code } from 'ui/code'
import { Columns } from 'ui/columns'
import { ratios } from './ratios.ts'

export default function Presets() {
	return (
		<Columns columns={3} gap="lg" align="start">
			{ratios.map((preset) => (
				<Card key={preset} className="p-0">
					<AspectRatio ratio={preset} className="flex items-center justify-center">
						<Code>{preset}</Code>
					</AspectRatio>
				</Card>
			))}
		</Columns>
	)
}
