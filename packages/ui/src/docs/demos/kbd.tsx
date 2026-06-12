import { Button } from '../../components/button'
import { Flex } from '../../components/flex'
import { Kbd } from '../../components/kbd'
import { Example } from '../components/example'

export function Demo() {
	return (
		<>
			<Example title="Default">
				<Kbd>K</Kbd>
			</Example>

			<Example title="Modifier glyphs">
				<Flex gap="md">
					<Kbd command>K</Kbd>
					<Kbd control>K</Kbd>
					<Kbd control command>
						K
					</Kbd>
				</Flex>
			</Example>

			<Example title="Inside a button">
				<Flex wrap gap="md">
					<Button suffix={<Kbd command>O</Kbd>}>Open</Button>
					<Button variant="soft" color="blue" suffix={<Kbd command>S</Kbd>}>
						Save
					</Button>
					<Button variant="outline" color="green" suffix={<Kbd command>R</Kbd>}>
						Run
					</Button>
					<Button variant="plain" color="red" suffix={<Kbd command>D</Kbd>}>
						Delete
					</Button>
				</Flex>
			</Example>
		</>
	)
}
