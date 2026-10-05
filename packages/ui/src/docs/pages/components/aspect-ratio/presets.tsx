import { AspectRatio, type AspectRatioPreset } from 'ui/aspect-ratio'
import { Card } from 'ui/card'

const presets: AspectRatioPreset[] = ['1/1', '3/2', '4/3', '16/9', '21/9', 'auto']

export default function Presets() {
	return (
		<div className="grid grid-cols-3 items-start gap-4">
			{presets.map((preset) => (
				<Card key={preset} className="p-0">
					<AspectRatio ratio={preset} className="flex items-center justify-center">
						{preset}
					</AspectRatio>
				</Card>
			))}
		</div>
	)
}
