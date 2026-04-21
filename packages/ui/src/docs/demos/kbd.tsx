import { Button } from '../../components/button'
import { Flex } from '../../components/flex'
import { Kbd } from '../../components/kbd'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Data Display' }

export default function KbdDemo() {
	return (
		<Stack gap={6}>
			<Example title="Default">
				<Kbd>K</Kbd>
			</Example>

			<Example title="Modifier glyphs">
				<Flex gap={3}>
					<Kbd cmd>K</Kbd>
					<Kbd ctrl>K</Kbd>
					<Kbd ctrl cmd>
						K
					</Kbd>
				</Flex>
			</Example>

			<Example title="Inside a button">
				<Flex wrap gap={3}>
					<Button suffix={<Kbd cmd>O</Kbd>}>Open</Button>
					<Button variant="soft" color="blue" suffix={<Kbd cmd>S</Kbd>}>
						Save
					</Button>
					<Button variant="outline" color="green" suffix={<Kbd cmd>R</Kbd>}>
						Run
					</Button>
					<Button variant="plain" color="red" suffix={<Kbd cmd>D</Kbd>}>
						Delete
					</Button>
				</Flex>
			</Example>
		</Stack>
	)
}
