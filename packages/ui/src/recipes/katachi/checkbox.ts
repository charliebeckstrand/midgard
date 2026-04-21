import { tv, type VariantProps } from 'tailwind-variants'
import { iro } from '../iro'
import { ki } from '../ki'
import { kumi } from '../kumi'
import { nuri } from '../nuri'
import { waku } from '../waku'

export const checkbox = tv({
	base: [
		'inline-flex',
		kumi.center,
		'relative',
		'size-4.5',
		ki.outline,
		'cursor-pointer',
		'has-checked:*:data-[slot=checkbox-check]:opacity-100',
		...waku.checkSurface,
		'rounded-[--spacing(1)]',
		'[--checkbox-checked-border:transparent]',
		'has-checked:bg-(--checkbox-checked-bg) has-checked:border-(--checkbox-checked-border)',
		'not-has-[:disabled]:has-checked:hover:opacity-90',
	],
	variants: {
		color: nuri.checkbox,
	},
	defaultVariants: { color: 'zinc' },
})

export const checkboxInput = tv({ base: waku.check })

export const slots = { disabled: iro.text.disabled }

export type CheckboxVariants = VariantProps<typeof checkbox>
