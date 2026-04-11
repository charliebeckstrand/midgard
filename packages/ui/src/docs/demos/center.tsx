import { Card } from '../../components/card'
import { Center } from '../../components/center'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Layout' }

export default function CenterDemo() {
	return (
		<div className="space-y-8">
			<Example
				title="Default"
				code={code`
					import { Center } from 'ui/center'

					<Center className="h-40">
						<Card>Centered</Card>
					</Center>
				`}
			>
				<Center className="h-40 w-full rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700">
					<Card>Centered</Card>
				</Center>
			</Example>

			<Example
				title="With max width"
				code={code`
					import { Center } from 'ui/center'

					<Center maxW="md" className="h-40">
						<Card>Constrained to max-w-md</Card>
					</Center>
				`}
			>
				<Center
					maxW="md"
					className="h-40 w-full rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700"
				>
					<Card>Constrained to max-w-md</Card>
				</Center>
			</Example>

			<Example
				title="Inline"
				code={code`
					import { Center } from 'ui/center'

					<Center inline className="size-20 rounded-full bg-zinc-100">
						OK
					</Center>
				`}
			>
				<Center inline className="size-20 rounded-full bg-zinc-100 dark:bg-zinc-800">
					OK
				</Center>
			</Example>
		</div>
	)
}
