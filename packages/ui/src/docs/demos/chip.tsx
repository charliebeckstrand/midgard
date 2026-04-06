'use client'

import { useState } from 'react'
import { Chip } from '../../components/chip'
import { Listbox, ListboxLabel, ListboxOption } from '../../components/listbox'

export const meta = { category: 'Data Display' }

const variants = ['solid', 'soft', 'outline', 'plain'] as const

const colorVariants = ['solid', 'soft', 'outline', 'plain'] as const

const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const

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
			<p className="text-sm font-medium text-zinc-500">Active</p>
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
	const [colorVariant, setColorVariant] = useState<(typeof colorVariants)[number]>('solid')

	return (
		<div className="space-y-6">
			<div className="space-y-3">
				<p className="text-sm font-medium text-zinc-500">Variants</p>
				<div className="flex flex-wrap gap-2">
					{variants.map((variant) => (
						<Chip key={variant} variant={variant}>
							{variant}
						</Chip>
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
						<Chip key={color} variant={colorVariant} color={color}>
							{color}
						</Chip>
					))}
				</div>
			</div>
			<div className="space-y-3">
				<p className="text-sm font-medium text-zinc-500">Sizes</p>
				<div className="flex flex-wrap items-center gap-2">
					{sizes.map(({ value, label }) => (
						<Chip key={value} size={value}>
							{label}
						</Chip>
					))}
				</div>
			</div>
			<ActiveRow />
		</div>
	)
}
