import { Card } from '../../components/card'
import { Flex } from '../../components/flex'
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
					<Flex justify="center">
						<Card>Centered</Card>
					</Flex>
				`}
			>
				<Card p={3} className="h-40 w-full">
					<Flex justify="center" className="h-full">
						<Card>Centered</Card>
					</Flex>
				</Card>
			</Example>

			<Example
				title="Inline"
				code={code`
					<Flex inline justify="center" className="size-20 rounded-full bg-zinc-100 dark:bg-zinc-800">
						OK
					</Flex>
				`}
			>
				<Flex inline justify="center" className="size-20 rounded-full bg-zinc-100 dark:bg-zinc-800">
					OK
				</Flex>
			</Example>
		</Stack>
	)
}
