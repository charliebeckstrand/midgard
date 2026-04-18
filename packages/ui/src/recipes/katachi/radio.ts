import { tv, type VariantProps } from 'tailwind-variants'
import { ki } from '../ki'
import { kumi } from '../kumi'
import { maru } from '../maru'
import { nuri } from '../nuri'
import { sumi } from '../sumi'
import { waku } from '../waku'

export const radio = tv({
	base: [
		'inline-flex',
		kumi.center,
		'relative',
		'size-4.5',
		ki.outline,
		'cursor-pointer',
		'has-checked:*:data-[slot=radio-indicator]:opacity-100',
		...waku.checkSurface,
		maru.roundedFull,
		'[--radio-checked-border:transparent]',
		'has-checked:bg-(--radio-checked-bg) has-checked:border-(--radio-checked-border)',
		'not-has-[:disabled]:has-checked:hover:opacity-90',
	],
	variants: {
		color: nuri.radio,
	},
	defaultVariants: { color: 'zinc' },
})

export const radioInput = tv({ base: waku.check })

export const slots = { disabled: sumi.textDisabled }

export type RadioVariants = VariantProps<typeof radio>
