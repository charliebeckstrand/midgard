import { useState } from 'react'
import { AspectRatio, type AspectRatioPreset } from '../../components/aspect-ratio'
import { Card } from '../../components/card'
import { Listbox, ListboxLabel, ListboxOption } from '../../components/listbox'
import { Sizer } from '../../components/sizer'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Layout' }

const presets: AspectRatioPreset[] = ['square', 'video', '4/3', '3/2', '16/9', '21/9']

function PresetsExample() {
	const [ratio, setRatio] = useState<AspectRatioPreset>('video')

	return (
		<Example
			title="Presets"
			actions={
				<Listbox
					value={ratio}
					onChange={(v) => v && setRatio(v)}
					displayValue={(v: AspectRatioPreset) => v}
					className="w-32"
				>
					{presets.map((preset) => (
						<ListboxOption key={preset} value={preset}>
							<ListboxLabel>{preset}</ListboxLabel>
						</ListboxOption>
					))}
				</Listbox>
			}
		>
			<Sizer size="xl">
				<AspectRatio ratio={ratio}>
					<Card className="flex flex-1 h-full items-center justify-center">{ratio}</Card>
				</AspectRatio>
			</Sizer>
		</Example>
	)
}

export default function AspectRatioDemo() {
	return (
		<Stack gap={6}>
			<PresetsExample />

			<Example title="Custom ratio">
				<Sizer size="xl">
					<AspectRatio ratio={1.618}>
						<Card className="flex flex-1 h-full items-center justify-center">Golden (1.618)</Card>
					</AspectRatio>
				</Sizer>
			</Example>
		</Stack>
	)
}
