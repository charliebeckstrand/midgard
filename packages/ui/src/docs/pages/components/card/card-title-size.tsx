import { Card, CardTitle } from 'ui/card'
import { Stack } from 'ui/stack'

const sizes = [
	{ size: 'sm', label: 'Small' },
	{ size: 'md', label: 'Medium' },
	{ size: 'lg', label: 'Large' },
] as const

export default function CardTitleSize() {
	return (
		<Stack gap="md">
			{sizes.map(({ size, label }) => (
				<Card key={size}>
					<CardTitle size={size}>{label}</CardTitle>
				</Card>
			))}
		</Stack>
	)
}
