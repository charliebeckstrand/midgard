import { Badge } from '../../components/badge'

export const meta = { category: 'Data Display' }

const colors = ['zinc', 'red', 'orange', 'amber', 'green', 'blue', 'indigo', 'violet'] as const

export default function BadgeDemo() {
	return (
		<div className="flex flex-wrap gap-2">
			{colors.map((color) => (
				<Badge key={color} color={color}>
					{color}
				</Badge>
			))}
		</div>
	)
}
