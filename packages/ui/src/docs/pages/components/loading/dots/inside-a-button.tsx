import { Button } from 'ui/button'
import { LoadingDots } from 'ui/loading'

const sizes = ['xs', 'sm', 'md', 'lg'] as const

export default function InsideAButton() {
	return sizes.map((size) => (
		<Button key={size} size={size} variant="soft" disabled aria-busy prefix={<LoadingDots />}>
			Saving
		</Button>
	))
}
