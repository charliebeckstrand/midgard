import { Button } from '../../components/button'
import { Flex } from '../../components/flex'
import { Kbd } from '../../components/kbd'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Data Display' }

export default function KbdDemo() {
	return (
		<Stack gap={8}>
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
					<Button>
						Open <Kbd cmd>O</Kbd>
					</Button>
					<Button variant="soft" color="blue">
						Save <Kbd cmd>S</Kbd>
					</Button>
					<Button variant="outline" color="green">
						Run <Kbd cmd>R</Kbd>
					</Button>
					<Button variant="plain" color="red">
						Delete <Kbd cmd>D</Kbd>
					</Button>
				</Flex>
			</Example>
		</Stack>
	)
}
