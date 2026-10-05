import { LoadingDots } from 'ui/loading'

const colors = ['current', 'zinc', 'red', 'amber', 'green', 'blue'] as const

export default function DotsColor() {
	return (
		<>
			{colors.map((color) => (
				<LoadingDots key={color} color={color} />
			))}
		</>
	)
}
