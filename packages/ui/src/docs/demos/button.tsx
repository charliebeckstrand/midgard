'use client'

import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/button'
import { Glass } from '../../components/glass'
import { Icon } from '../../components/icon'
import { ColorListbox } from '../components/color-listbox'
import { Example } from '../components/example'
import { SizeListbox, sizeLabels } from '../components/size-listbox'
import { VariantListbox } from '../components/variant-listbox'

export const meta = { category: 'Forms' }

const variants = ['solid', 'soft', 'outline', 'plain', 'ghost'] as const

type Variant = (typeof variants)[number]

const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const

type Color = (typeof colors)[number]

export const sizes = ['xs', 'sm', 'md', 'lg'] as const

type Size = (typeof sizes)[number]

export default function ButtonDemo() {
	const [colorVariant, setColorVariant] = useState<Variant>('solid')
	const [rippleColor, setRippleColor] = useState<Color>('zinc')

	const [iconSize, setIconSize] = useState<Size>('md')
	const [iconOnlySize, setIconOnlySize] = useState<Size>('md')

	return (
		<div className="space-y-8">
			<Example title="Variants">
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
					<VariantListbox variants={variants} value={colorVariant} onChange={setColorVariant} />
				}
			>
				<div className="flex flex-wrap gap-2">
					{colors.map((color) => (
						<Button key={color} variant={colorVariant} color={color}>
							{color}
						</Button>
					))}
				</div>
			</Example>
			<Example title="Sizes">
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
			>
				<div className="flex flex-wrap gap-2">
					{variants.map((variant) => (
						<Button key={variant} variant={variant} size={iconSize}>
							<Icon icon={<Plus />} />
							{variant}
						</Button>
					))}
				</div>
			</Example>
			<Example
				title="Icon only"
				actions={<SizeListbox sizes={sizes} value={iconOnlySize} onChange={setIconOnlySize} />}
			>
				<div className="flex flex-wrap gap-2">
					{variants.map((variant) => (
						<Button key={variant} variant={variant} size={iconOnlySize}>
							<Icon icon={<Plus />} />
						</Button>
					))}
				</div>
			</Example>
			<Example
				title="Ripple"
				actions={<ColorListbox colors={colors} value={rippleColor} onChange={setRippleColor} />}
			>
				<div className="flex flex-wrap gap-2">
					{variants.map((variant) => (
						<Button key={variant} variant={variant} color={rippleColor} ripple>
							{variant}
						</Button>
					))}
				</div>
			</Example>
			<Example title="Spring">
				<Button spring>Spring</Button>
			</Example>
			<Example title="Glass">
				<Glass>
					<div className="flex flex-wrap gap-2">
						<Button>Glass</Button>
						<Button variant="glass">
							<Icon icon={<Plus />} />
							With icon
						</Button>
					</div>
				</Glass>
			</Example>
			<Example title="Disabled">
				<Button disabled>Disabled</Button>
			</Example>
			<Example title="Loading">
				<Button loading>Loading</Button>
			</Example>
		</div>
	)
}
