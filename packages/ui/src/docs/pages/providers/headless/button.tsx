import { Button } from 'ui/button'
import { HeadlessProvider } from 'ui/providers/headless'

export default function HeadlessButton() {
	return (
		<>
			<Button>With chrome</Button>
			<HeadlessProvider>
				<Button>Bare element</Button>
			</HeadlessProvider>
		</>
	)
}
