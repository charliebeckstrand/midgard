import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/button'
import { Flex } from '../../components/flex'
import { Icon } from '../../components/icon'
import { Example } from '../components/example'
import { SizeListbox, sizeLabels } from '../components/size-listbox'
import { VariantListbox } from '../components/variant-listbox'

export const meta = { category: 'Forms' }

const variants = ['solid', 'soft', 'outline', 'plain', 'bare'] as const

type Variant = (typeof variants)[number]

const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const

const sizes = ['xs', 'sm', 'md', 'lg'] as const

type Size = (typeof sizes)[number]

export function Demo() {
	const [colorVariant, setColorVariant] = useState<Variant>('solid')

	const [iconSize, setIconSize] = useState<Size>('md')

	const [iconOnlySize, setIconOnlySize] = useState<Size>('md')

	return (
		<>
			<Example title="Variants">
				<Flex wrap gap="sm">
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
					<VariantListbox
						variants={variants}
						value={colorVariant}
						onValueChange={setColorVariant}
					/>
				}
			>
				<Flex wrap gap="sm">
					{colors.map((color) => (
						<Button key={color} variant={colorVariant} color={color}>
							{color}
						</Button>
					))}
				</Flex>
			</Example>

			<Example title="Sizes">
				<Flex wrap gap="sm">
					{sizes.map((s) => (
						<Button key={s} size={s}>
							{sizeLabels[s] ?? s}
						</Button>
					))}
				</Flex>
			</Example>

			<Example
				title="With icon"
				actions={<SizeListbox sizes={sizes} value={iconSize} onValueChange={setIconSize} />}
			>
				<Flex wrap gap="sm">
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
				actions={<SizeListbox sizes={sizes} value={iconOnlySize} onValueChange={setIconOnlySize} />}
			>
				<Flex wrap gap="sm">
					{variants.map((variant) => (
						<Button key={variant} aria-label="Add" variant={variant} size={iconOnlySize}>
							<Icon icon={<Plus />} />
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
		</>
	)
}
