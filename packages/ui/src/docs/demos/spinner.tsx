import { Button } from '../../components/button'
import { Spinner } from '../../components/spinner'
import { code } from '../code'
import { Example } from '../example'

export const meta = { category: 'Feedback' }

const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const

const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export default function SpinnerDemo() {
	return (
		<div className="space-y-8">
			<Example
				title="Default"
				code={code`
					import { Spinner } from 'ui/spinner'

					<Spinner />
				`}
			>
				<Spinner />
			</Example>
			<Example
				title="Sizes"
				code={code`
					import { Spinner } from 'ui/spinner'

					${sizes.map((s) => `<Spinner size="${s}" />`)}
				`}
			>
				<div className="flex items-end gap-4">
					{sizes.map((s) => (
						<div key={s} className="flex flex-col items-center gap-2">
							<Spinner size={s} />
							<span className="text-xs text-zinc-500">{s}</span>
						</div>
					))}
				</div>
			</Example>
			<Example
				title="Colors"
				code={code`
					import { Spinner } from 'ui/spinner'

					${colors.map((c) => `<Spinner color="${c}" />`)}
				`}
			>
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
				code={code`
					import { Button } from 'ui/button'
					import { Spinner } from 'ui/spinner'

					<Button disabled>
						<Spinner size="sm" />
						Loading
					</Button>
				`}
			>
				<div className="flex items-center gap-3">
					<Button disabled>
						<Spinner size="sm" />
						Loading
					</Button>
					<Button variant="soft" disabled>
						<Spinner size="sm" />
						Saving
					</Button>
				</div>
			</Example>
		</div>
	)
}
