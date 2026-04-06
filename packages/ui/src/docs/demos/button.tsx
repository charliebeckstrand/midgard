'use client'

import { useState } from 'react'
import { Button } from '../../components/button'
import { Listbox, ListboxLabel, ListboxOption } from '../../components/listbox'
import { PlusIcon } from '../../primitives/icons'

export const meta = { category: 'Forms' }

const variants = ['solid', 'soft', 'outline', 'plain', 'ghost'] as const

const colorVariants = ['solid', 'soft', 'outline', 'plain', 'ghost'] as const

const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const

const sizes = [
	{ value: 'sm', label: 'small' },
	{ value: 'md', label: 'medium' },
	{ value: 'lg', label: 'large' },
] as const

export default function ButtonDemo() {
	const [colorVariant, setColorVariant] = useState<(typeof colorVariants)[number]>('solid')

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
			<div className="flex flex-col gap-3">
				<p className="text-sm font-medium text-zinc-500">Colors</p>
				<div className="flex">
					<Listbox
						value={colorVariant}
						onChange={setColorVariant}
						className="min-w-26"
						displayValue={(v: string) => v.charAt(0).toUpperCase() + v.slice(1)}
					>
						{colorVariants.map((v) => (
							<ListboxOption key={v} value={v}>
								<ListboxLabel>{v.charAt(0).toUpperCase() + v.slice(1)}</ListboxLabel>
							</ListboxOption>
						))}
					</Listbox>
				</div>
				<div className="flex flex-wrap gap-2">
					{colors.map((color) => (
						<Button key={color} variant={colorVariant} color={color}>
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
				<p className="text-sm font-medium text-zinc-500">Icon</p>
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
