import { tv, type VariantProps } from 'tailwind-variants'
import { ji } from '../ryu/ji'
import { sen } from '../ryu/sen'
import { control } from '../waku/control'

// Default control density for textarea (size isn't variable here).
const density = ['px-[calc(--spacing(3)-1px)] py-[calc(--spacing(2)-1px)]', ji.size.md]

export const textarea = tv({
	base: ['block', ...control.field, ...density, 'rounded-lg', 'min-h-10'],
	variants: {
		variant: {
			default: [],
			outline: [],
			glass: control.surface.glass,
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
			default: control.surface.default,
			outline: control.surface.outline,
			glass: [],
		},
	},
	defaultVariants: { variant: 'default' },
})

export const slots = {
	/** Strips textarea chrome when nested inside a framed container. */
	bare: ['border-0', 'rounded-none', 'pt-3 focus:outline-hidden'],
	/** ControlFrame border when an actions slot is present. */
	frame: [...sen.border],
	/** Actions row beneath the textarea. */
	actions: 'flex items-center gap-2 px-1.5 pb-1.5',
}

export type TextareaVariants = VariantProps<typeof textarea>
