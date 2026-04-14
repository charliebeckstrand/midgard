import { Area } from '../../components/area'
import { Card } from '../../components/card'
import { Center } from '../../components/center'
import { Stack } from '../../components/stack'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Layout' }

export default function CenterDemo() {
	return (
		<Stack gap={8}>
			<Example
				title="Default"
				code={code`
					import { Center } from 'ui/center'

					<Center>
						<Card>Centered</Card>
					</Center>
				`}
			>
				<Area className="h-40 w-full">
					<Center className="h-full">
						<Card>Centered</Card>
					</Center>
				</Area>
			</Example>

			<Example
				title="With max width"
				code={code`
					import { Center } from 'ui/center'

					<Center maxW="md">
						<Card>Constrained to max-w-md</Card>
					</Center>
				`}
			>
				<Area className="h-40 w-full">
					<Center maxW="md" className="h-full">
						<Card>Constrained to max-w-md</Card>
					</Center>
				</Area>
			</Example>

			<Example
				title="Inline"
				code={code`
					import { Center } from 'ui/center'

					<Center inline className="size-20 rounded-full bg-zinc-100 dark:bg-zinc-800">
						OK
					</Center>
				`}
			>
				<Center inline className="size-20 rounded-full bg-zinc-100 dark:bg-zinc-800">
					OK
				</Center>
			</Example>
		</Stack>
	)
}
