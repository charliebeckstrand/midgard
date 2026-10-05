import { Button } from 'ui/button'
import { Kbd } from 'ui/kbd'

export default function InsideAButton() {
	return (
		<>
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
		</>
	)
}
