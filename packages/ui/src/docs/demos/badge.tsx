'use client'

import { useState } from 'react'
import { Badge } from '../../components/badge'
import { Listbox, ListboxLabel, ListboxOption } from '../../components/listbox'
import { Example } from '../example'

export const meta = { category: 'Data Display' }

const variants = ['solid', 'soft', 'outline'] as const

const colorVariants = ['solid', 'soft', 'outline'] as const

const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const

const sizes = [
	{ value: 'sm', label: 'small' },
	{ value: 'md', label: 'medium' },
	{ value: 'lg', label: 'large' },
] as const

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export default function BadgeDemo() {
	const [colorVariant, setColorVariant] = useState<(typeof colorVariants)[number]>('solid')

	return (
		<div className="space-y-8">
			<Example
				title="Variants"
				code={`import { Badge } from 'ui/badge'\n\n${variants.map((v) => `<Badge variant="${v}">${cap(v)}</Badge>`).join('\n')}`}
			>
				<div className="flex flex-wrap gap-2">
					{variants.map((variant) => (
						<Badge key={variant} variant={variant}>
							{variant}
						</Badge>
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
				code={`import { Badge } from 'ui/badge'\n\n${colors
					.map((c) => `<Badge variant="${colorVariant}" color="${c}">${cap(c)}</Badge>`)
					.join('\n')}`}
			>
				<div className="flex flex-wrap gap-2">
					{colors.map((color) => (
						<Badge key={color} variant={colorVariant} color={color}>
							{color}
						</Badge>
					))}
				</div>
			</Example>
			<Example
				title="Sizes"
				code={`import { Badge } from 'ui/badge'\n\n${sizes.map((s) => `<Badge size="${s.value}">${cap(s.label)}</Badge>`).join('\n')}`}
			>
				<div className="flex flex-wrap items-center gap-2">
					{sizes.map(({ value, label }) => (
						<Badge key={value} size={value}>
							{label}
						</Badge>
					))}
				</div>
			</Example>
		</div>
	)
}
