'use client'

import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { ColorListbox } from '../color-listbox'
import { Example } from '../example'
import { SizeListbox, sizeLabels } from '../size-listbox'
import { VariantListbox } from '../variant-listbox'

export const meta = { category: 'Forms' }

const variants = ['solid', 'soft', 'outline', 'plain', 'ghost'] as const

const colorVariants = ['solid', 'soft', 'outline', 'plain', 'ghost'] as const

const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const

const sizes = ['xs', 'sm', 'md', 'lg'] as const

type Size = (typeof sizes)[number]

export default function ButtonDemo() {
	const [colorVariant, setColorVariant] = useState<(typeof colorVariants)[number]>('solid')
	const [iconSize, setIconSize] = useState<Size>('md')
	const [iconOnlySize, setIconOnlySize] = useState<Size>('md')
	const [rippleColor, setRippleColor] = useState<(typeof colors)[number]>('zinc')

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
					<VariantListbox
						variants={colorVariants}
						value={colorVariant}
						onChange={setColorVariant}
					/>
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
			<Example title="Disabled">
				<Button disabled>Disabled</Button>
			</Example>
			<Example title="Loading">
				<div className="flex flex-wrap items-center gap-2">
					<Button loading>Loading</Button>
					<Button loading variant="soft">
						<Icon icon={<Plus />} />
						Saving
					</Button>
					<Button loading variant="outline">
						<Icon icon={<Plus />} />
					</Button>
				</div>
			</Example>
		</div>
	)
}
