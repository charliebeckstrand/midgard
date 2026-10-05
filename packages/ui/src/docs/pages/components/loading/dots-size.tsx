import { LoadingDots } from 'ui/loading'

const sizes = ['xs', 'sm', 'md', 'lg'] as const

export default function DotsSize() {
	return (
		<>
			{sizes.map((size) => (
				<LoadingDots key={size} size={size} />
			))}
		</>
	)
}
