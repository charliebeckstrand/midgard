import { tv, type VariantProps } from 'tailwind-variants'
import { colorMatrix } from '../../core/recipe'
import { kage } from '../kage'
import { ki } from '../ki'
import { kumi } from '../kumi'
import { maru } from '../maru'
import { nuri } from '../nuri'
import { omote } from '../omote'
import { sawari } from '../sawari'
import { take } from '../take'
import { yasumi } from '../yasumi'

export const button = tv({
	base: [
		'relative isolate',
		'inline-flex',
		kumi.center,
		'w-fit',
		'shrink-0',
		'font-semibold',
		maru.rounded,
		ki.inset,
		...yasumi.disabled,
		sawari.cursor,
		'border',
	],
	variants: {
		variant: {
			solid: [...kage.borderTransparent],
			soft: [...kage.borderTransparent],
			outline: [...kage.borderStrong],
			plain: [...kage.borderTransparent],
			ghost: [...kage.borderTransparent],
			glass: [...kage.borderTransparent, ...omote.glass],
		},
		color: { zinc: '', red: '', amber: '', green: '', blue: '', inherit: '' },
		size: take.button,
	},
	compoundVariants: [
		...colorMatrix('solid', nuri.buttonSolid),
		...colorMatrix('soft', nuri.buttonSoft),
		...colorMatrix('outline', nuri.buttonOutline),
		...colorMatrix('plain', nuri.buttonPlain),
		...colorMatrix('ghost', nuri.buttonGhost),
		...colorMatrix('glass', nuri.buttonPlain),
	],
	defaultVariants: { variant: 'solid', color: 'zinc', size: 'md' },
})

export const withIconStartSize = tv({
	variants: { size: take.buttonWithIcon.start },
	defaultVariants: { size: 'md' },
})

export const withIconEndSize = tv({
	variants: { size: take.buttonWithIcon.end },
	defaultVariants: { size: 'md' },
})

export const withKbdStartSize = tv({
	variants: { size: take.buttonWithKbd.start },
	defaultVariants: { size: 'md' },
})

export const withKbdEndSize = tv({
	variants: { size: take.buttonWithKbd.end },
	defaultVariants: { size: 'md' },
})

export type ButtonVariants = VariantProps<typeof button>
