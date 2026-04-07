'use client'

import { useState } from 'react'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { Listbox, ListboxLabel, ListboxOption } from '../../components/listbox'
import { code } from '../code'
import { Example } from '../example'

export const meta = { category: 'Base' }

const variants = ['solid', 'soft', 'outline', 'plain', 'ghost'] as const

const colorVariants = ['solid', 'soft', 'outline', 'plain', 'ghost'] as const

const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const

const sizes = [
	{ value: 'sm', label: 'small' },
	{ value: 'md', label: 'medium' },
	{ value: 'lg', label: 'large' },
] as const

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export default function ButtonDemo() {
	const [colorVariant, setColorVariant] = useState<(typeof colorVariants)[number]>('solid')

	return (
		<div className="space-y-8">
			<Example
				title="Variants"
				code={code`
					import { Button } from 'ui/button'

					${variants.map((v) => `<Button variant="${v}">${cap(v)}</Button>`)}
				`}
			>
				<div className="flex flex-wrap gap-2">
					{variants.map((variant) => (
						<Button key={variant} variant={variant}>
							{variant}
						</Button>
					))}
				</div>
			</Example>
			<Example
				title="Colors"
				actions={
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
				}
				code={code`
					import { Button } from 'ui/button'

					${colors.map((c) => `<Button variant="${colorVariant}" color="${c}">${cap(c)}</Button>`)}
				`}
			>
				<div className="flex flex-wrap gap-2">
					{colors.map((color) => (
						<Button key={color} variant={colorVariant} color={color}>
							{color}
						</Button>
					))}
				</div>
			</Example>
			<Example
				title="Sizes"
				code={code`
					import { Button } from 'ui/button'

					${sizes.map((s) => `<Button size="${s.value}">${cap(s.label)}</Button>`)}
				`}
			>
				<div className="flex flex-wrap items-center gap-2">
					{sizes.map(({ value, label }) => (
						<Button key={value} size={value}>
							{label}
						</Button>
					))}
				</div>
			</Example>
			<Example
				title="With icon"
				code={code`
					import { Button } from 'ui/button'
					import { Icon } from 'ui/icon'

					${variants.map((v) => `<Button variant="${v}">\n  <Icon name="plus" />\n  ${cap(v)}\n</Button>`)}
				`}
			>
				<div className="flex flex-wrap gap-2">
					{variants.map((variant) => (
						<Button key={variant} variant={variant}>
							<Icon name="plus" />
							{variant}
						</Button>
					))}
				</div>
			</Example>
			<Example
				title="Icon only"
				code={code`
					import { Button } from 'ui/button'
					import { Icon } from 'ui/icon'

					${variants.map((v) => `<Button variant="${v}">\n  <Icon name="plus" />\n</Button>`)}
				`}
			>
				<div className="flex flex-wrap gap-2">
					{variants.map((variant) => (
						<Button key={variant} variant={variant}>
							<Icon name="plus" />
						</Button>
					))}
				</div>
			</Example>
			<Example
				title="Disabled"
				code={code`
					import { Button } from 'ui/button'

					<Button disabled>Disabled</Button>
				`}
			>
				<Button disabled>Disabled</Button>
			</Example>
		</div>
	)
}
