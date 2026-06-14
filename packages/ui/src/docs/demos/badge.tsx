import { useState } from 'react'
import { Badge } from '../../components/badge'
import { Flex } from '../../components/flex'
import { Example } from '../components/example'
import { VariantListbox } from '../components/variant-listbox'

const variants = ['solid', 'soft', 'outline', 'plain'] as const

const colorVariants = ['solid', 'soft', 'outline', 'plain'] as const

const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const

// Badge opts into the wide palette (`iro.spectrum`); these are available on
// top of the standard set above.
const extendedColors = ['mist', 'rose', 'violet', 'sky'] as const

const sizes = [
	{ value: 'sm', label: 'small' },
	{ value: 'md', label: 'medium' },
	{ value: 'lg', label: 'large' },
] as const

export function Demo() {
	const [colorVariant, setColorVariant] = useState<(typeof colorVariants)[number]>('solid')

	return (
		<>
			<Example title="Variants">
				<Flex wrap gap="sm">
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
						onValueChange={setColorVariant}
					/>
				}
			>
				<Flex wrap gap="sm">
					{colors.map((color) => (
						<Badge key={color} variant={colorVariant} color={color}>
							{color}
						</Badge>
					))}
				</Flex>
			</Example>

			<Example title="Extended palette">
				<Flex wrap gap="sm">
					{extendedColors.map((color) => (
						<Badge key={color} variant={colorVariant} color={color}>
							{color}
						</Badge>
					))}
				</Flex>
			</Example>

			<Example title="Sizes">
				<Flex wrap gap="sm">
					{sizes.map(({ value, label }) => (
						<Badge key={value} size={value}>
							{label}
						</Badge>
					))}
				</Flex>
			</Example>

			<Example title="Rounded">
				<Flex wrap gap="sm">
					{sizes.map(({ value, label }) => (
						<Badge key={value} size={value} rounded="full" variant="outline">
							{label}
						</Badge>
					))}
				</Flex>
			</Example>
		</>
	)
}
