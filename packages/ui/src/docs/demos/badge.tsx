import { Badge } from '../../components/badge'

export const meta = { category: 'Data Display' }

const colors = ['zinc', 'red', 'amber', 'green', 'blue', 'teal', 'purple', 'pink'] as const

const sizes = ['sm', 'md', 'lg'] as const

export default function BadgeDemo() {
	return (
		<div className="space-y-4">
			{sizes.map((size) => (
				<div key={size} className="flex flex-wrap items-center gap-2">
					{colors.map((color) => (
						<Badge key={color} color={color} size={size}>
							{color}
						</Badge>
					))}
				</div>
			))}
		</div>
	)
}
