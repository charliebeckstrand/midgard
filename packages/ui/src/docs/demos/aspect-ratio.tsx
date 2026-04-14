import { useState } from 'react'
import { AspectRatio, type AspectRatioPreset } from '../../components/aspect-ratio'
import { Listbox, ListboxLabel, ListboxOption } from '../../components/listbox'
import { Sizer } from '../../components/sizer'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Layout' }

const placeholder =
	'flex items-center justify-center rounded-lg bg-zinc-100 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'

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
				import { useState } from 'react'
				import { AspectRatio, type AspectRatioPreset } from 'ui/aspect-ratio'
				import { Listbox, ListboxLabel, ListboxOption } from 'ui/listbox'

				const presets: AspectRatioPreset[] = ['square', 'video', '4/3', '3/2', '16/9', '21/9']

				const [ratio, setRatio] = useState<AspectRatioPreset>('video')

				<Listbox value={ratio} onChange={setRatio} displayValue={(v) => v}>
					{presets.map((preset) => (
						<ListboxOption key={preset} value={preset}>
							<ListboxLabel>{preset}</ListboxLabel>
						</ListboxOption>
					))}
				</Listbox>
				<AspectRatio ratio={ratio} />
			`}
		>
			<Sizer size="xl">
				<AspectRatio ratio={ratio} className={placeholder}></AspectRatio>
			</Sizer>
		</Example>
	)
}

export default function AspectRatioDemo() {
	return (
		<div className="space-y-8">
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
					<AspectRatio ratio={1.618} className={placeholder}>
						Golden (1.618)
					</AspectRatio>
				</Sizer>
			</Example>
		</div>
	)
}
