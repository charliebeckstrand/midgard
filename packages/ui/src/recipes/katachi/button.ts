import { tv, type VariantProps } from 'tailwind-variants'
import { iro } from '../../core/recipe'
import { kage } from '../kage'
import { ki } from '../ki'
import { kumi } from '../kumi'
import { maru } from '../maru'
import { nuri } from '../nuri'
import { omote } from '../omote'
import { sawari } from '../sawari'
import { take } from '../take'
import { yasumi } from '../yasumi'

const { color, compoundVariants } = iro({
	solid: nuri.buttonSolid,
	soft: nuri.buttonSoft,
	outline: nuri.buttonOutline,
	plain: nuri.buttonPlain,
	ghost: nuri.buttonGhost,
	glass: nuri.buttonPlain,
})

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
		color,
		size: take.button,
	},
	compoundVariants,
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
