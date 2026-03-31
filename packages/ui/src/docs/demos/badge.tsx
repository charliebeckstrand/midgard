import { Badge } from '../../components/badge'

export const meta = { category: 'Data Display' }

const colors = ['zinc', 'red', 'amber', 'green', 'blue', 'teal'] as const

const sizes = ['sm', 'md', 'lg'] as const

export default function BadgeDemo() {
	return (
		<div className="space-y-8">
			<div className="space-y-1">
				<p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Solid</p>
				<div className="space-y-4">
					{sizes.map((size) => (
						<div key={size} className="flex flex-wrap items-center gap-2">
							{colors.map((color) => (
								<Badge key={color} variant="solid" color={color} size={size}>
									{color}
								</Badge>
							))}
						</div>
					))}
				</div>
			</div>
			<div className="space-y-1">
				<p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Subtle</p>
				<div className="space-y-4">
					{sizes.map((size) => (
						<div key={size} className="flex flex-wrap items-center gap-2">
							{colors.map((color) => (
								<Badge key={color} variant="soft" color={color} size={size}>
									{color}
								</Badge>
							))}
						</div>
					))}
				</div>
			</div>
		</div>
	)
}
