import { tv, type VariantProps } from 'tailwind-variants'
import { iro } from '../ryu/iro'
import { control } from '../waku/control'

export const input = tv({
	base: [...control.field, 'block', 'rounded-lg'],
	variants: {
		variant: {
			default: [],
			outline: [],
			glass: [],
		},
		density: control.density,
		size: control.size,
	},
	defaultVariants: { variant: 'default', density: 'md', size: 'md' },
})

export const inputControl = tv({
	base: [],
	variants: {
		variant: {
			default: control.surface.default,
			outline: [],
			glass: control.surface.glass,
		},
	},
	defaultVariants: { variant: 'default' },
})

export const slots = {
	affix: ['flex items-center min-w-0', '*:data-[slot=icon]:pointer-events-none', ...iro.text.muted],
	prefix: control.affix.prefix,
	suffix: control.affix.suffix,
	autofill: control.affix.autofill,
	number: control.resets.number,
}

export type InputVariants = VariantProps<typeof input>

export { input as inputVariants, inputControl as controlVariants, slots as k }
