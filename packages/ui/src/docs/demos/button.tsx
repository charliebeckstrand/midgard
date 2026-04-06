import { Button } from '../../components/button'

export const meta = { category: 'Forms' }

function PlusIcon() {
	return (
		<svg data-slot="icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
			<path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
		</svg>
	)
}

const variants = ['solid', 'soft', 'outline', 'plain', 'ghost'] as const

const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const

const sizes = [
	{ value: 'sm', label: 'small' },
	{ value: 'md', label: 'medium' },
	{ value: 'lg', label: 'large' },
] as const

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
				<p className="text-sm font-medium text-zinc-500">Colors (soft)</p>
				<div className="flex flex-wrap gap-2">
					{colors.map((color) => (
						<Button key={color} variant="soft" color={color}>
							{color}
						</Button>
					))}
				</div>
			</div>
			<div className="space-y-3">
				<p className="text-sm font-medium text-zinc-500">Sizes</p>
				<div className="flex flex-wrap items-center gap-2">
					{sizes.map(({ value, label }) => (
						<Button key={value} size={value}>
							{label}
						</Button>
					))}
				</div>
			</div>
			<div className="space-y-3">
				<p className="text-sm font-medium text-zinc-500">Icon only</p>
				<div className="flex flex-wrap gap-2">
					{variants.map((variant) => (
						<Button key={variant} variant={variant}>
							<PlusIcon />
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
