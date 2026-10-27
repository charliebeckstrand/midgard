import { Button } from 'ui/button'

const sizes = ['xs', 'sm', 'md', 'lg'] as const

export default function InsideAButton() {
	return sizes.map((size) => (
		<Button key={size} size={size} loading>
			Loading
		</Button>
	))
}
