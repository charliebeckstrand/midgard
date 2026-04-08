'use client'

import { useState } from 'react'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { code } from '../code'
import { Example } from '../example'
import { SizeListbox, sizeLabels } from '../size-listbox'
import { VariantListbox } from '../variant-listbox'

export const meta = { category: 'Base' }

const variants = ['solid', 'soft', 'outline', 'plain', 'ghost'] as const

const colorVariants = ['solid', 'soft', 'outline', 'plain', 'ghost'] as const

const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const

const sizes = ['sm', 'md', 'lg'] as const

type Size = (typeof sizes)[number]

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export default function ButtonDemo() {
	const [colorVariant, setColorVariant] = useState<(typeof colorVariants)[number]>('solid')
	const [iconSize, setIconSize] = useState<Size>('md')
	const [iconOnlySize, setIconOnlySize] = useState<Size>('md')

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
					<VariantListbox
						variants={colorVariants}
						value={colorVariant}
						onChange={setColorVariant}
					/>
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

					${sizes.map((s) => `<Button size="${s}">${sizeLabels[s] ?? s}</Button>`)}
				`}
			>
				<div className="flex flex-wrap items-center gap-2">
					{sizes.map((s) => (
						<Button key={s} size={s}>
							{sizeLabels[s] ?? s}
						</Button>
					))}
				</div>
			</Example>
			<Example
				title="With icon"
				actions={<SizeListbox sizes={sizes} value={iconSize} onChange={setIconSize} />}
				code={code`
					import { Button } from 'ui/button'
					import { Icon } from 'ui/icon'

					${variants.map((v) => `<Button variant="${v}" size="${iconSize}">\n  <Icon name="plus" />\n  ${cap(v)}\n</Button>`)}
				`}
			>
				<div className="flex flex-wrap gap-2">
					{variants.map((variant) => (
						<Button key={variant} variant={variant} size={iconSize}>
							<Icon name="plus" />
							{variant}
						</Button>
					))}
				</div>
			</Example>
			<Example
				title="Icon only"
				actions={<SizeListbox sizes={sizes} value={iconOnlySize} onChange={setIconOnlySize} />}
				code={code`
					import { Button } from 'ui/button'
					import { Icon } from 'ui/icon'

					${variants.map((v) => `<Button variant="${v}" size="${iconOnlySize}">\n  <Icon name="plus" />\n</Button>`)}
				`}
			>
				<div className="flex flex-wrap gap-2">
					{variants.map((variant) => (
						<Button key={variant} variant={variant} size={iconOnlySize}>
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
