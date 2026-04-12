import { useState } from 'react'
import { StatusDot } from '../../components/status'
import { Example } from '../components/example'
import { SizeListbox } from '../components/size-listbox'
import { VariantListbox } from '../components/variant-listbox'

export const meta = { category: 'Data Display' }

const statuses = ['inactive', 'active', 'info', 'warning', 'error'] as const

const sizes = ['xs', 'sm', 'md', 'lg'] as const

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export default function StatusDemo() {
	const [status, setStatus] = useState<(typeof statuses)[number]>('active')
	const [pulseSize, setPulseSize] = useState<(typeof sizes)[number]>('md')

	return (
		<div className="space-y-8">
			<Example title="Statuses">
				<div className="flex flex-col gap-3">
					{statuses.map((s) => (
						<div key={s} className="flex items-center gap-2">
							<StatusDot status={s} />
							<span className="text-sm text-zinc-500 dark:text-zinc-400">{cap(s)}</span>
						</div>
					))}
				</div>
			</Example>
			<Example title="Outline">
				<div className="flex flex-col gap-3">
					{statuses.map((s) => (
						<div key={s} className="flex items-center gap-2">
							<StatusDot variant="outline" status={s} />
							<span className="text-sm text-zinc-500 dark:text-zinc-400">{cap(s)}</span>
						</div>
					))}
				</div>
			</Example>
			<Example
				title="Sizes"
				actions={<VariantListbox variants={statuses} value={status} onChange={setStatus} />}
			>
				<div className="flex flex-col gap-3">
					{sizes.map((size) => (
						<div key={size} className="flex items-center gap-2">
							<StatusDot status={status} size={size} />
							<span className="text-sm text-zinc-500 dark:text-zinc-400">{size}</span>
						</div>
					))}
				</div>
			</Example>
			<Example
				title="Pulse"
				actions={<SizeListbox sizes={sizes} value={pulseSize} onChange={setPulseSize} />}
			>
				<div className="flex items-center">
					<StatusDot status="error" size={pulseSize} pulse />
				</div>
			</Example>
		</div>
	)
}
