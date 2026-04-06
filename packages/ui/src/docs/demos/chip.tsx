'use client'

import { useState } from 'react'
import { Chip } from '../../components/chip'
import { Listbox, ListboxLabel, ListboxOption } from '../../components/listbox'
import { Example } from '../example'

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

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export default function ChipDemo() {
	const [colorVariant, setColorVariant] = useState<(typeof colorVariants)[number]>('solid')
	const [active, setActive] = useState<Set<string>>(() => new Set(['First', 'Second']))

	const toggle = (label: string) =>
		setActive((prev) => {
			const next = new Set(prev)

			if (next.has(label)) next.delete(label)
			else next.add(label)

			return next
		})

	return (
		<div className="space-y-8">
			<Example
				title="Variants"
				code={`import { Chip } from 'ui/chip'\n\n${variants.map((v) => `<Chip variant="${v}">${cap(v)}</Chip>`).join('\n')}`}
			>
				<div className="flex flex-wrap gap-2">
					{variants.map((variant) => (
						<Chip key={variant} variant={variant}>
							{variant}
						</Chip>
					))}
				</div>
			</Example>
			<Example
				title={
					<div className="flex items-center justify-between gap-2">
						<div>Colors</div>
						<Listbox
							value={colorVariant}
							onChange={setColorVariant}
							className="min-w-26"
							displayValue={(v: string) => cap(v)}
						>
							{colorVariants.map((v) => (
								<ListboxOption key={v} value={v}>
									<ListboxLabel>{cap(v)}</ListboxLabel>
								</ListboxOption>
							))}
						</Listbox>
					</div>
				}
				code={`import { Chip } from 'ui/chip'\n\n${colors
					.map((c) => `<Chip variant="${colorVariant}" color="${c}">${cap(c)}</Chip>`)
					.join('\n')}`}
			>
				<div className="flex flex-wrap gap-2">
					{colors.map((color) => (
						<Chip key={color} variant={colorVariant} color={color}>
							{color}
						</Chip>
					))}
				</div>
			</Example>
			<Example
				title="Sizes"
				code={`import { Chip } from 'ui/chip'\n\n${sizes.map((s) => `<Chip size="${s.value}">${cap(s.label)}</Chip>`).join('\n')}`}
			>
				<div className="flex flex-wrap items-center gap-2">
					{sizes.map(({ value, label }) => (
						<Chip key={value} size={value}>
							{label}
						</Chip>
					))}
				</div>
			</Example>
			<Example
				title="Active"
				code={`import { Chip } from 'ui/chip'\n\n${labels
					.map(
						(l) =>
							`<Chip variant="outline"${active.has(l) ? ' active' : ''} onClick={toggle}>${l}</Chip>`,
					)
					.join('\n')}`}
			>
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
			</Example>
		</div>
	)
}
