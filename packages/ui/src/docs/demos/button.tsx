'use client'

import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/button'
import { Flex } from '../../components/flex'
import { Icon } from '../../components/icon'
import { Stack } from '../../components/stack'
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
		<Stack gap={6}>
			<Example title="Variants">
				<Flex wrap gap={2}>
					{variants.map((variant) => (
						<Button key={variant} variant={variant}>
							{variant}
						</Button>
					))}
				</Flex>
			</Example>

			<Example
				title="Colors"
				actions={
					<VariantListbox variants={variants} value={colorVariant} onChange={setColorVariant} />
				}
			>
				<Flex wrap gap={2}>
					{colors.map((color) => (
						<Button key={color} variant={colorVariant} color={color}>
							{color}
						</Button>
					))}
				</Flex>
			</Example>

			<Example title="Sizes">
				<Flex wrap gap={2}>
					{sizes.map((s) => (
						<Button key={s} size={s}>
							{sizeLabels[s] ?? s}
						</Button>
					))}
				</Flex>
			</Example>

			<Example
				title="With icon"
				actions={<SizeListbox sizes={sizes} value={iconSize} onChange={setIconSize} />}
			>
				<Flex wrap gap={2}>
					{variants.map((variant) => (
						<Button
							key={variant}
							variant={variant}
							size={iconSize}
							prefix={<Icon icon={<Plus />} />}
						>
							{variant}
						</Button>
					))}
				</Flex>
			</Example>

			<Example
				title="Icon only"
				actions={<SizeListbox sizes={sizes} value={iconOnlySize} onChange={setIconOnlySize} />}
			>
				<Flex wrap gap={2}>
					{variants.map((variant) => (
						<Button
							key={variant}
							variant={variant}
							size={iconOnlySize}
							prefix={<Icon icon={<Plus />} />}
						/>
					))}
				</Flex>
			</Example>

			<Example
				title="Ripple"
				actions={<ColorListbox colors={colors} value={rippleColor} onChange={setRippleColor} />}
			>
				<Flex wrap gap={2}>
					{variants.map((variant) => (
						<Button key={variant} variant={variant} color={rippleColor} ripple>
							{variant}
						</Button>
					))}
				</Flex>
			</Example>

			<Example title="Spring">
				<Button spring>Spring</Button>
			</Example>

			<Example title="Disabled">
				<Button disabled>Disabled</Button>
			</Example>

			<Example title="Loading">
				<Button loading>Loading</Button>
			</Example>
		</Stack>
	)
}
