import type { VariantPropsOf } from '../../core/recipe'
import { control } from '../katakana'
import { kokkaku, sen } from '../kiso'

export const k = control({
	base: ['block', 'min-h-10'],
	resize: {
		none: 'resize-none',
		vertical: 'resize-y',
		horizontal: 'resize-x',
	},
	autoResize: { true: 'field-sizing-content', false: '' },
	slots: {
		/** Strips textarea chrome when nested inside a framed container. */
		bare: ['border-0', 'rounded-none', 'focus:outline-hidden'],
		/** ControlFrame border when an actions slot is present. */
		frame: [...sen.border],
		/** Actions row beneath the textarea. */
		actions: 'flex items-center mt-auto gap-2 pr-2 pb-2',
	},
	defaults: { resize: 'none', autoResize: false },
	skeleton: kokkaku.textarea,
})

export type TextareaVariants = VariantPropsOf<typeof k>
