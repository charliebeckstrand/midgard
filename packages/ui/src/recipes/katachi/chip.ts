import { tv, type VariantProps } from 'tailwind-variants'
import { iro } from '../../core/recipe'
import { ki } from '../ki'
import { maru } from '../maru'
import { nuri } from '../nuri'
import { sawari } from '../sawari'
import { take } from '../take'

const inactive = iro(
	{
		solid: nuri.solid,
		soft: nuri.soft,
		outline: nuri.outline,
		plain: nuri.text,
	},
	{ active: false },
)

const active = iro(
	{
		solid: nuri.solid,
		soft: nuri.solid,
		outline: nuri.chipOutlineActive,
		plain: nuri.soft,
	},
	{ active: true },
)

export const chip = tv({
	base: [
		'group inline-flex w-fit items-center select-none',
		'font-medium',
		maru.roundedFull,
		sawari.cursor,
		ki.ring,
	],
	variants: {
		variant: {
			solid: 'border border-transparent',
			soft: 'border border-transparent',
			outline: 'border',
			plain: 'border border-transparent',
		},
		color: inactive.color,
		active: { true: '', false: '' },
		size: take.chip,
	},
	compoundVariants: [...inactive.compoundVariants, ...active.compoundVariants],
	defaultVariants: { variant: 'outline', color: 'zinc', size: 'md', active: false },
})

export type ChipVariants = VariantProps<typeof chip>
