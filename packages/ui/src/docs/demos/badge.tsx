'use client'

import { useState } from 'react'
import { Badge } from '../../components/badge'
import { Flex } from '../../components/flex'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'
import { VariantListbox } from '../components/variant-listbox'

export const meta = { category: 'Data Display' }

const variants = ['solid', 'soft', 'outline', 'plain'] as const

const colorVariants = ['solid', 'soft', 'outline', 'plain'] as const

const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const

const sizes = [
	{ value: 'sm', label: 'small' },
	{ value: 'md', label: 'medium' },
	{ value: 'lg', label: 'large' },
] as const

export default function BadgeDemo() {
	const [colorVariant, setColorVariant] = useState<(typeof colorVariants)[number]>('solid')

	return (
		<Stack gap={8}>
			<Example title="Variants">
				<Flex wrap gap={2}>
					{variants.map((variant) => (
						<Badge key={variant} variant={variant}>
							{variant}
						</Badge>
					))}
				</Flex>
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
				<Flex wrap gap={2}>
					{colors.map((color) => (
						<Badge key={color} variant={colorVariant} color={color}>
							{color}
						</Badge>
					))}
				</Flex>
			</Example>
			<Example title="Sizes">
				<Flex wrap gap={2}>
					{sizes.map(({ value, label }) => (
						<Badge key={value} size={value}>
							{label}
						</Badge>
					))}
				</Flex>
			</Example>
		</Stack>
	)
}
