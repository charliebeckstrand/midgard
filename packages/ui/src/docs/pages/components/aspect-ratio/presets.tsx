import { AspectRatio } from 'ui/aspect-ratio'
import { Card } from 'ui/card'
import { ratios } from './ratios.ts'

export default function Presets() {
	return (
		<div className="grid grid-cols-3 items-start gap-4">
			{ratios.map((preset) => (
				<Card key={preset} className="p-0">
					<AspectRatio ratio={preset} className="flex items-center justify-center">
						{preset}
					</AspectRatio>
				</Card>
			))}
		</div>
	)
}
