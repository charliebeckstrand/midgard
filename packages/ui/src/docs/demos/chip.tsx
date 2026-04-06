'use client'

import { useState } from 'react'
import { Chip } from '../../components/chip'

export const meta = { category: 'Data Display' }

const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const

const variants = ['solid', 'soft', 'outline', 'plain'] as const

const sizes = ['sm', 'md', 'lg'] as const

function ToggleRow({ variant }: { variant: (typeof variants)[number] }) {
	const [active, setActive] = useState<string | null>(null)

	return (
		<div className="space-y-3">
			<p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 capitalize">{variant}</p>
			<div className="flex flex-wrap items-center gap-2">
				{colors.map((color) => (
					<Chip
						key={color}
						variant={variant}
						color={color}
						active={active === color}
						onClick={() => setActive(active === color ? null : color)}
					>
						{color}
					</Chip>
				))}
			</div>
		</div>
	)
}

export default function ChipDemo() {
	return (
		<div className="space-y-8">
			{variants.map((variant) => (
				<ToggleRow key={variant} variant={variant} />
			))}
			<div className="space-y-3">
				<p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Sizes</p>
				<div className="flex flex-wrap items-center gap-2">
					{sizes.map((size) => (
						<Chip key={size} size={size}>
							{size}
						</Chip>
					))}
				</div>
			</div>
		</div>
	)
}
