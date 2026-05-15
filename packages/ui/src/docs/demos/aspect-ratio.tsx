'use client'

import { useState } from 'react'
import { AspectRatio, type AspectRatioPreset } from '../../components/aspect-ratio'
import { Card } from '../../components/card'
import { Listbox, ListboxLabel, ListboxOption } from '../../components/listbox'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Layout' }

const presets: { label: string; value: AspectRatioPreset }[] = [
	{ label: 'Square', value: 'square' },
	{ label: 'Video', value: 'video' },
	{ label: '4/3', value: '4/3' },
	{ label: '3/2', value: '3/2' },
	{ label: '16/9', value: '16/9' },
	{ label: '21/9', value: '21/9' },
]

function Sizer({ children, className }: { children: React.ReactNode; className?: string }) {
	return <div className={`sm:max-w-sm ${className}`}>{children}</div>
}

function PresetsExample() {
	const [ratio, setRatio] = useState<AspectRatioPreset>('square')

	return (
		<Example
			title="Presets"
			actions={
				<Listbox
					value={ratio}
					onValueChange={(v) => v && setRatio(v)}
					displayValue={(v: AspectRatioPreset) =>
						presets.find((preset) => preset.value === v)?.label || v
					}
					className="w-32"
				>
					{presets.map((preset) => (
						<ListboxOption key={preset.value} value={preset.value}>
							<ListboxLabel>{preset.label}</ListboxLabel>
						</ListboxOption>
					))}
				</Listbox>
			}
		>
			<Sizer>
				<AspectRatio ratio={ratio}>
					<Card className="flex flex-1 h-full items-center justify-center">{ratio}</Card>
				</AspectRatio>
			</Sizer>
		</Example>
	)
}

export default function AspectRatioDemo() {
	return (
		<Stack gap="xl">
			<PresetsExample />

			<Example title="Custom ratio">
				<Sizer>
					<AspectRatio ratio={1.618}>
						<Card className="flex flex-1 h-full items-center justify-center">1.618</Card>
					</AspectRatio>
				</Sizer>
			</Example>
		</Stack>
	)
}
