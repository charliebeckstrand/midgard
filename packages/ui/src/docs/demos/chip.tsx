'use client'

import { useState } from 'react'
import { Chip } from '../../components/chip'

export const meta = { category: 'Data Display' }

const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const

const variants = ['solid', 'soft', 'outline', 'plain'] as const

const sizes = [
	{ value: 'sm', label: 'small' },
	{ value: 'md', label: 'medium' },
	{ value: 'lg', label: 'large' },
] as const

const labels = ['First', 'Second', 'Third', 'Fourth', 'Fifth'] as const

function ActiveRow() {
	const [active, setActive] = useState<Set<string>>(() => new Set(['First']))

	const toggle = (label: string) =>
		setActive((prev) => {
			const next = new Set(prev)

			if (next.has(label)) next.delete(label)
			else next.add(label)

			return next
		})

	return (
		<div className="space-y-3">
			<p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Active</p>
			<div className="flex flex-wrap items-center gap-2">
				{labels.map((label) => (
					<Chip
						key={label}
						variant="outline"
						active={active.has(label)}
						onClick={() => toggle(label)}
					>
						{label}
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
				<div key={variant} className="space-y-3">
					<p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 capitalize">
						{variant}
					</p>
					<div className="flex flex-wrap items-center gap-2">
						{colors.map((color) => (
							<Chip key={color} variant={variant} color={color}>
								{color}
							</Chip>
						))}
					</div>
				</div>
			))}
			<ActiveRow />
			<div className="space-y-3">
				<p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Sizes</p>
				<div className="flex flex-wrap items-center gap-2">
					{sizes.map((size) => (
						<Chip key={size.value} size={size.value}>
							{size.label}
						</Chip>
					))}
				</div>
			</div>
		</div>
	)
}
