import { tv, type VariantProps } from 'tailwind-variants'
import { iro } from '../iro'
import { maru } from '../maru'
import { omote } from '../omote'
import { sen } from '../sen'
import { waku } from '../waku'
import { controlSize } from './_control-size'

export const input = tv({
	base: [...waku.inputBase, 'block', maru.rounded.lg],
	variants: {
		variant: {
			default: [],
			outline: [],
			glass: [...omote.glass],
		},
		size: controlSize,
	},
	defaultVariants: { variant: 'default', size: 'md' },
})

export const inputControl = tv({
	variants: {
		variant: {
			default: [...waku.control.surface],
			outline: [...sen.borderEmphasis, 'hover:border-zinc-950/30', 'dark:hover:border-white/30'],
			glass: [],
		},
	},
	defaultVariants: { variant: 'default' },
})

export const inputDate = tv({ base: [...waku.date] })

export const slots = {
	affix: ['flex items-center min-w-0', '*:data-[slot=icon]:pointer-events-none', ...iro.text.muted],
	prefix: {
		sm: 'pl-[calc(--spacing(2.5)-1px)] py-[calc(--spacing(0.5)-1px)] has-[button]:pl-1',
		md: 'pl-[calc(--spacing(3)-1px)] py-[calc(--spacing(1)-1px)] has-[button]:pl-1.5',
		lg: 'pl-[calc(--spacing(3.5)-1px)] py-[calc(--spacing(1.5)-1px)] has-[button]:pl-1.5',
	},
	suffix: {
		sm: 'pr-[calc(--spacing(2.5)-1px)] py-[calc(--spacing(0.5)-1px)] has-[button]:pr-1',
		md: 'pr-[calc(--spacing(3)-1px)] py-[calc(--spacing(1)-1px)] has-[button]:pr-1.5',
		lg: 'pr-[calc(--spacing(3.5)-1px)] py-[calc(--spacing(1.5)-1px)] has-[button]:pr-1.5',
	},
	autofill: {
		prefix: {
			sm: 'autofill:ml-[calc(--spacing(2.5)-1px)] peer-has-[button]/prefix:autofill:ml-1',
			md: 'autofill:ml-[calc(--spacing(3)-1px)] peer-has-[button]/prefix:autofill:ml-1.5',
			lg: 'autofill:ml-[calc(--spacing(3.5)-1px)] peer-has-[button]/prefix:autofill:ml-1.5',
		},
		suffix: {
			sm: 'autofill:mr-[calc(--spacing(2.5)-1px)] group-has-[[data-slot=suffix]_button]/control:autofill:mr-1',
			md: 'autofill:mr-[calc(--spacing(3)-1px)] group-has-[[data-slot=suffix]_button]/control:autofill:mr-1.5',
			lg: 'autofill:mr-[calc(--spacing(3.5)-1px)] group-has-[[data-slot=suffix]_button]/control:autofill:mr-1.5',
		},
	},
	number: waku.number,
}

export type InputVariants = VariantProps<typeof input>
