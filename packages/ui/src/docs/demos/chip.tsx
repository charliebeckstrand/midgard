'use client'

import { useState } from 'react'
import { Chip } from '../../components/chip'
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

const labels = ['First', 'Second', 'Third', 'Fourth', 'Fifth'] as const

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
		<Stack gap={8}>
			<Example title="Variants">
				<Flex wrap gap={2}>
					{variants.map((variant) => (
						<Chip key={variant} variant={variant}>
							{variant}
						</Chip>
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
						<Chip key={color} variant={colorVariant} color={color}>
							{color}
						</Chip>
					))}
				</Flex>
			</Example>

			<Example title="Sizes">
				<Flex wrap gap={2}>
					{sizes.map(({ value, label }) => (
						<Chip key={value} size={value}>
							{label}
						</Chip>
					))}
				</Flex>
			</Example>

			<Example title="Active">
				<Flex wrap gap={2}>
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
				</Flex>
			</Example>
		</Stack>
	)
}
