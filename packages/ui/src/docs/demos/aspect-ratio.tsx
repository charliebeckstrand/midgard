import { useState } from 'react'
import { Area } from '../components/area'
import { AspectRatio, type AspectRatioPreset } from '../../components/aspect-ratio'
import { Listbox, ListboxLabel, ListboxOption } from '../../components/listbox'
import { Sizer } from '../../components/sizer'
import { Stack } from '../../components/stack'
import { code } from '../code'
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
			code={code`
				import { AspectRatio, type AspectRatioPreset } from 'ui/aspect-ratio'
				
				<AspectRatio ratio="16/9" />
			`}
		>
			<Sizer size="xl">
				<AspectRatio ratio={ratio}>
					<Area center>{ratio}</Area>
				</AspectRatio>
			</Sizer>
		</Example>
	)
}

export default function AspectRatioDemo() {
	return (
		<Stack gap={8}>
			<PresetsExample />

			<Example
				title="Custom ratio"
				code={code`
					import { AspectRatio } from 'ui/aspect-ratio'

					<AspectRatio ratio={1.618}>
						Golden
					</AspectRatio>
				`}
			>
				<Sizer size="xl">
					<AspectRatio ratio={1.618}>
						<Area center>Golden (1.618)</Area>
					</AspectRatio>
				</Sizer>
			</Example>
		</Stack>
	)
}
