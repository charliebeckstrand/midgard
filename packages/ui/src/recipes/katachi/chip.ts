import { tv, type VariantProps } from 'tailwind-variants'
import { colorMatrix } from '../../core/recipe'
import { ki } from '../ki'
import { maru } from '../maru'
import { nuri } from '../nuri'
import { sawari } from '../sawari'
import { take } from '../take'

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
		color: { zinc: '', red: '', amber: '', green: '', blue: '' },
		active: { true: '', false: '' },
		size: take.chip,
	},
	compoundVariants: [
		...colorMatrix('solid', nuri.solid, { active: false }),
		...colorMatrix('solid', nuri.solid, { active: true }),
		...colorMatrix('soft', nuri.soft, { active: false }),
		...colorMatrix('soft', nuri.solid, { active: true }),
		...colorMatrix('outline', nuri.outline, { active: false }),
		...colorMatrix('outline', nuri.chipOutlineActive, { active: true }),
		...colorMatrix('plain', nuri.text, { active: false }),
		...colorMatrix('plain', nuri.soft, { active: true }),
	],
	defaultVariants: { variant: 'outline', color: 'zinc', size: 'md', active: false },
})

export type ChipVariants = VariantProps<typeof chip>
