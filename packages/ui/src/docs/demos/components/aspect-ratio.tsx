import { useState } from 'react'
import { AspectRatio, type AspectRatioPreset } from '../../../components/aspect-ratio'
import { Card } from '../../../components/card'
import { Example, OptionsListbox } from '../../engine'

const presets: { label: string; value: AspectRatioPreset }[] = [
	{ label: 'Square', value: 'square' },
	{ label: 'Video', value: 'video' },
	{ label: 'Auto', value: 'auto' },
	{ label: '21/9', value: '21/9' },
	{ label: '16/9', value: '16/9' },
	{ label: '4/3', value: '4/3' },
	{ label: '3/2', value: '3/2' },
	{ label: '1/1', value: '1/1' },
]

function PresetsExample() {
	const [ratio, setRatio] = useState<AspectRatioPreset>('square')

	return (
		<Example
			title="Presets"
			actions={
				<OptionsListbox label="Ratio" options={presets} value={ratio} onValueChange={setRatio} />
			}
		>
			<Card className="p-0">
				<AspectRatio ratio={ratio} className="flex items-center justify-center">
					{ratio}
				</AspectRatio>
			</Card>
		</Example>
	)
}

export function Demo() {
	return (
		<>
			<PresetsExample />

			<Example title="Custom ratio">
				<Card className="p-0">
					<AspectRatio ratio={1.618} className="flex items-center justify-center">
						1.618
					</AspectRatio>
				</Card>
			</Example>
		</>
	)
}
