import { useState } from 'react'
import { Button } from '../../components/button'
import { Spinner } from '../../components/spinner'
import { Example } from '../components/example'
import { SizeListbox } from '../components/size-listbox'
import { sizes as buttonSizes } from '../demos/button'

export const meta = { category: 'Feedback' }

const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const

type ButtonSize = (typeof buttonSizes)[number]

const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export default function SpinnerDemo() {
	const [buttonSize, setButtonSize] = useState<ButtonSize>('md')

	return (
		<div className="space-y-8">
			<Example title="Default">
				<Spinner />
			</Example>
			<Example title="Sizes">
				<div className="flex items-end gap-4">
					{sizes.map((s) => (
						<div key={s} className="flex flex-col items-center gap-2">
							<Spinner size={s} />
							<span className="text-xs text-zinc-500">{s}</span>
						</div>
					))}
				</div>
			</Example>
			<Example title="Colors">
				<div className="flex items-center gap-4">
					{colors.map((c) => (
						<div key={c} className="flex flex-col items-center gap-2">
							<Spinner color={c} size="lg" />
							<span className="text-xs text-zinc-500">{cap(c)}</span>
						</div>
					))}
				</div>
			</Example>
			<Example
				title="Inside a button"
				actions={<SizeListbox sizes={buttonSizes} value={buttonSize} onChange={setButtonSize} />}
			>
				<div className="flex items-center gap-3">
					<Button disabled size={buttonSize}>
						<Spinner />
						Loading
					</Button>
					<Button variant="soft" disabled size={buttonSize}>
						<Spinner />
						Saving
					</Button>
				</div>
			</Example>
		</div>
	)
}
