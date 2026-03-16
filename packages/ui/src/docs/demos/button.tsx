import { Button } from '../../components/button'

export const meta = { category: 'Forms' }

const variants = ['solid', 'outline', 'plain', 'ghost'] as const

const colors = ['zinc', 'red', 'amber', 'green', 'blue', 'purple', 'pink'] as const

export default function ButtonDemo() {
	return (
		<div className="space-y-6">
			<div className="space-y-3">
				<p className="text-sm font-medium text-zinc-500">Variants</p>
				<div className="flex flex-wrap gap-2">
					{variants.map((variant) => (
						<Button key={variant} variant={variant}>
							{variant}
						</Button>
					))}
				</div>
			</div>
			<div className="space-y-3">
				<p className="text-sm font-medium text-zinc-500">Colors (solid)</p>
				<div className="flex flex-wrap gap-2">
					{colors.map((color) => (
						<Button key={color} color={color}>
							{color}
						</Button>
					))}
				</div>
			</div>
			<div className="space-y-3">
				<p className="text-sm font-medium text-zinc-500">Disabled</p>
				<Button disabled>Disabled</Button>
			</div>
		</div>
	)
}
