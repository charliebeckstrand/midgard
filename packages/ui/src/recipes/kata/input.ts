import { tv, type VariantProps } from 'tailwind-variants'
import { iro } from '../ryu/iro'
import { maru } from '../ryu/maru'
import { control } from '../waku/control'

export const input = tv({
	base: [...control.field, 'block', maru.rounded.lg],
	variants: {
		variant: {
			default: [],
			outline: [],
			glass: [],
		},
		size: control.size,
	},
	defaultVariants: { variant: 'default', size: 'md' },
})

export const inputControl = tv({
	variants: {
		variant: {
			default: control.surface.default,
			outline: [],
			glass: control.surface.glass,
		},
	},
	defaultVariants: { variant: 'default' },
})

export const inputDate = tv({ base: control.resets.date })

export const slots = {
	affix: ['flex items-center min-w-0', '*:data-[slot=icon]:pointer-events-none', ...iro.text.muted],
	prefix: control.affix.prefix,
	suffix: control.affix.suffix,
	autofill: control.affix.autofill,
	number: control.resets.number,
}

export type InputVariants = VariantProps<typeof input>
