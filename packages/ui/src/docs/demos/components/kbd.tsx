import { Button } from '../../../components/button'
import { Kbd } from '../../../components/kbd'
import { Flex } from '../../../structure/flex'
import { Axes, Example } from '../../engine'

export function Demo() {
	return (
		<>
			<Axes of="Kbd" render={(props) => <Kbd {...props}>⌘K</Kbd>} />

			<Example title="Modifier glyphs">
				<Flex gap="md">
					<Kbd>⌘K</Kbd>
					<Kbd>⌃K</Kbd>
					<Kbd>⌃⌘K</Kbd>
				</Flex>
			</Example>

			<Example title="Inside a button">
				<Button suffix={<Kbd>⌘O</Kbd>}>Open</Button>
				<Button variant="soft" color="blue" suffix={<Kbd>⌘S</Kbd>}>
					Save
				</Button>
				<Button variant="outline" color="green" suffix={<Kbd>⌘R</Kbd>}>
					Run
				</Button>
				<Button variant="plain" color="red" suffix={<Kbd>⌘D</Kbd>}>
					Delete
				</Button>
			</Example>
		</>
	)
}
