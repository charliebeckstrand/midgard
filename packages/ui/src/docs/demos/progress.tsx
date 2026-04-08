'use client'

import { Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { ProgressBar, ProgressGauge } from '../../components/progress'
import { code } from '../code'
import { Example } from '../example'

export const meta = { category: 'Feedback' }

const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const

const barSizes = ['sm', 'md', 'lg'] as const

const gaugeSizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const

const step = 10

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function InteractiveBar() {
	const [value, setValue] = useState(60)

	return (
		<Example
			title="Default"
			actions={
				<div className="flex items-center gap-1">
					<Button
						variant="plain"
						disabled={value <= 0}
						onClick={() => setValue((v) => Math.max(0, v - step))}
					>
						<Icon icon={<Minus />} />
					</Button>
					<Button
						variant="plain"
						disabled={value >= 100}
						onClick={() => setValue((v) => Math.min(100, v + step))}
					>
						<Icon icon={<Plus />} />
					</Button>
				</div>
			}
			code={code`
				import { ProgressBar } from 'ui/progress'

				<ProgressBar value={60} />
			`}
		>
			<div className="lg:max-w-sm">
				<ProgressBar value={value} />
			</div>
		</Example>
	)
}

function InteractiveGauge() {
	const [value, setValue] = useState(60)

	return (
		<Example
			title="Gauge"
			actions={
				<div className="flex items-center gap-1">
					<Button
						variant="plain"
						disabled={value <= 0}
						onClick={() => setValue((v) => Math.max(0, v - step))}
					>
						<Icon icon={<Minus />} />
					</Button>
					<Button
						variant="plain"
						disabled={value >= 100}
						onClick={() => setValue((v) => Math.min(100, v + step))}
					>
						<Icon icon={<Plus />} />
					</Button>
				</div>
			}
			code={code`
				import { ProgressGauge } from 'ui/progress'

				<ProgressGauge value={60} />
			`}
		>
			<ProgressGauge value={value} size="lg" />
		</Example>
	)
}

export default function ProgressDemo() {
	return (
		<div className="space-y-8">
			<InteractiveBar />
			<Example
				title="Bar sizes"
				code={code`
					import { ProgressBar } from 'ui/progress'

					<ProgressBar size="sm" value={40} />
					<ProgressBar size="md" value={60} />
					<ProgressBar size="lg" value={80} />
				`}
			>
				<div className="flex lg:max-w-sm flex-col gap-4">
					{barSizes.map((s) => (
						<div key={s} className="flex items-center gap-3">
							<span className="w-6 text-xs text-zinc-500">{s}</span>
							<ProgressBar size={s} value={60} className="flex-1" />
						</div>
					))}
				</div>
			</Example>
			<Example
				title="Bar colors"
				code={code`
					import { ProgressBar } from 'ui/progress'

					${colors.map((c) => `<ProgressBar color="${c}" value={60} />`)}
				`}
			>
				<div className="flex lg:max-w-sm flex-col gap-4">
					{colors.map((color) => (
						<div key={color} className="flex items-center gap-3">
							<span className="w-10 text-xs text-zinc-500">{cap(color)}</span>
							<ProgressBar color={color} value={60} className="flex-1" />
						</div>
					))}
				</div>
			</Example>
			<InteractiveGauge />
			<Example
				title="Gauge sizes"
				code={code`
					import { ProgressGauge } from 'ui/progress'

					<ProgressGauge value={75} size="xs" />
					<ProgressGauge value={75} size="sm" />
					<ProgressGauge value={75} size="md" />
					<ProgressGauge value={75} size="lg" />
					<ProgressGauge value={75} size="xl" />
				`}
			>
				<div className="flex items-end gap-4">
					{gaugeSizes.map((s) => (
						<div key={s} className="flex flex-col items-center gap-2">
							<ProgressGauge value={75} size={s} color="amber" />
							<span className="text-xs text-zinc-500">{s}</span>
						</div>
					))}
				</div>
			</Example>
			<Example
				title="Gauge with label"
				code={code`
					import { ProgressGauge } from 'ui/progress'

					<ProgressGauge value={80} label={true} />
					<ProgressGauge value={100} label={true} />
				`}
			>
				<div className="flex items-end gap-4">
					{gaugeSizes.map((s) => (
						<ProgressGauge
							key={s}
							value={s === 'xs' ? 60 : 80}
							size={s}
							color="green"
							label={s !== 'xs'}
						/>
					))}
					<ProgressGauge value={100} size="xl" color="green" label />
				</div>
			</Example>
			<Example
				title="Gauge colors"
				code={code`
					import { ProgressGauge } from 'ui/progress'

					${colors.map((c) => `<ProgressGauge color="${c}" value={75} label />`)}
				`}
			>
				<div className="flex items-center gap-4">
					{colors.map((color) => (
						<ProgressGauge key={color} color={color} value={75} size="lg" />
					))}
				</div>
			</Example>
		</div>
	)
}
