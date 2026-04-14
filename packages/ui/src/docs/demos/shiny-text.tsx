'use client'

import { useState } from 'react'
import { ShinyText } from '../../components/shiny-text'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Other' }

const speeds = [
	{ value: 1, label: 'Fast' },
	{ value: 2, label: 'Default' },
	{ value: 4, label: 'Slow' },
] as const

export default function ShinyTextDemo() {
	const [disabled, setDisabled] = useState(false)

	return (
		<Stack gap={8}>
			<Example title="Default">
				<ShinyText text="Shiny Text" className="text-2xl font-bold" />
			</Example>
			<Example title="Speeds">
				<Stack gap={4}>
					{speeds.map(({ value, label }) => (
						<ShinyText
							key={value}
							text={`${label} (${value}s)`}
							speed={value}
							className="text-xl font-semibold"
						/>
					))}
				</Stack>
			</Example>
			<Example title="Yoyo">
				<ShinyText text="Back and forth" yoyo className="text-xl font-semibold" />
			</Example>
			<Example title="Pause on hover">
				<ShinyText text="Hover to pause" pauseOnHover className="text-xl font-semibold" />
			</Example>
			<Example title="Direction">
				<Stack gap={4}>
					<ShinyText text="Left (default)" direction="left" className="text-xl font-semibold" />
					<ShinyText text="Right" direction="right" className="text-xl font-semibold" />
				</Stack>
			</Example>
			<Example title="Custom colors">
				<Stack gap={4}>
					<ShinyText
						text="Gold shine"
						color="#92700a"
						shineColor="#fbbf24"
						className="text-xl font-bold"
					/>
					<ShinyText
						text="Blue shine"
						color="#1e40af"
						shineColor="#60a5fa"
						className="text-xl font-bold"
					/>
				</Stack>
			</Example>
			<Example
				title="Disabled"
				actions={
					<label className="flex items-center gap-2 text-sm">
						<input
							type="checkbox"
							checked={disabled}
							onChange={(e) => setDisabled(e.target.checked)}
						/>
						Disable
					</label>
				}
			>
				<ShinyText text="Toggle me" disabled={disabled} className="text-xl font-semibold" />
			</Example>
		</Stack>
	)
}
