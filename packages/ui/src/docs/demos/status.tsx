import { StatusDot } from '../../components/status'
import { Example } from '../example'

export const meta = { category: 'Data Display' }

const statuses = ['inactive', 'active', 'warning', 'error'] as const

const sizes = ['xs', 'sm', 'md', 'lg'] as const

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export default function StatusDemo() {
	return (
		<div className="space-y-8">
			<Example title="Statuses">
				<div className="flex flex-col gap-3">
					{statuses.map((status) => (
						<div key={status} className="flex items-center gap-2">
							<StatusDot status={status} />
							<span className="text-sm text-zinc-500 dark:text-zinc-400">{cap(status)}</span>
						</div>
					))}
				</div>
			</Example>
			<Example title="Sizes">
				<div className="flex flex-col gap-3">
					{sizes.map((size) => (
						<div key={size} className="flex items-center gap-2">
							<StatusDot status="active" size={size} />
							<span className="text-sm text-zinc-500 dark:text-zinc-400">{size}</span>
						</div>
					))}
				</div>
			</Example>
		</div>
	)
}
