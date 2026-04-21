import { tv, type VariantProps } from 'tailwind-variants'
import { colorVariants } from '../../core/recipe'
import { iro, merge } from '../iro'
import { ji } from '../ji'
import { ki } from '../ki'
import { kumi } from '../kumi'
import { maru } from '../maru'
import { sawari } from '../sawari'

const { solid, soft, outline, plain } = iro.palette

const solidChip = merge(solid.bg, solid.text)
const softChip = merge(soft.bg, soft.text)
const outlineChip = merge(outline.ring, outline.text)
const outlineChipActive = merge(outline.ring, outline.text, solid.bg, solid.text)

const inactive = colorVariants(
	{
		solid: solidChip,
		soft: softChip,
		outline: outlineChip,
		plain: plain.text,
	},
	{ active: false },
)

const active = colorVariants(
	{
		solid: solidChip,
		soft: softChip,
		outline: outlineChipActive,
		plain: softChip,
	},
	{ active: true },
)

const size = {
	xs: ['px-1 py-0.5', kumi.gap.xs, ji.size.xs, '*:data-[slot=icon]:size-3'],
	sm: ['px-1.5 py-0.5', kumi.gap.sm, ji.size.sm, '*:data-[slot=icon]:size-4'],
	md: ['px-2 py-0.5', kumi.gap.md, ji.size.md, '*:data-[slot=icon]:size-3.5'],
	lg: ['px-2.5 py-1', kumi.gap.lg, ji.size.lg, '*:data-[slot=icon]:size-4'],
}

export const chip = tv({
	base: [
		'group inline-flex w-fit items-center select-none',
		'font-medium',
		maru.rounded.full,
		sawari.cursor,
		ki.ring,
	],
	variants: {
		variant: {
			solid: '',
			soft: '',
			outline: 'ring-1 ring-inset',
			plain: '',
		},
		color: inactive.color,
		interactive: { true: '', false: '' },
		active: { true: '', false: '' },
		size,
	},
	compoundVariants: [...inactive.compoundVariants, ...active.compoundVariants],
	defaultVariants: { variant: 'outline', color: 'zinc', size: 'md', active: false },
})

export type ChipVariants = VariantProps<typeof chip>
