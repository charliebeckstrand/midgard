import { tv, type VariantProps } from 'tailwind-variants'
import { kage } from '../kage'
import { omote } from '../omote'
import { waku } from '../waku'

export const textarea = tv({
	base: [waku.input, 'min-h-9'],
	variants: {
		variant: {
			default: [],
			outline: [],
			glass: [...omote.glass],
		},
		resize: {
			none: 'resize-none',
			vertical: 'resize-y',
			horizontal: 'resize-x',
		},
		autoResize: { true: 'field-sizing-content', false: '' },
	},
	defaultVariants: { variant: 'default', resize: 'none', autoResize: false },
})

export const textareaControl = tv({
	variants: {
		variant: {
			default: [...waku.control.surface],
			outline: [...kage.borderEmphasis, 'hover:border-zinc-950/30', 'dark:hover:border-white/30'],
			glass: [],
		},
	},
	defaultVariants: { variant: 'default' },
})

export const slots = {
	/** Strips textarea chrome when nested inside a framed container. */
	bare: 'border-0 rounded-none pt-3 focus:outline-hidden',
	/** ControlFrame border when an actions slot is present. */
	frame: [...kage.border],
	/** Actions row beneath the textarea. */
	actions: 'flex items-center gap-2 px-1.5 pb-1.5',
}

export type TextareaVariants = VariantProps<typeof textarea>
