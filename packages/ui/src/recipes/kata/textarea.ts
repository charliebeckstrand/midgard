import { tv, type VariantProps } from 'tailwind-variants'
import { sen } from '../ryu/sen'
import { control } from '../waku/control'

export const textarea = tv({
	base: ['block', ...control.field, 'rounded-lg', 'min-h-10'],
	variants: {
		variant: {
			default: [],
			outline: [],
			glass: [],
		},
		density: control.density,
		size: control.size,
		resize: {
			none: 'resize-none',
			vertical: 'resize-y',
			horizontal: 'resize-x',
		},
		autoResize: { true: 'field-sizing-content', false: '' },
	},
	defaultVariants: {
		variant: 'default',
		density: 'md',
		size: 'md',
		resize: 'none',
		autoResize: false,
	},
})

export const textareaControl = tv({
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
	/** Strips textarea chrome when nested inside a framed container. */
	bare: ['border-0', 'rounded-none', 'focus:outline-hidden'],
	/** ControlFrame border when an actions slot is present. */
	frame: [...sen.border],
	/** Actions row beneath the textarea. */
	actions: 'flex items-center mt-auto gap-2 pr-2 pb-2',
}

export type TextareaVariants = VariantProps<typeof textarea>

export { textarea as textareaVariants, textareaControl as controlVariants, slots as k }
