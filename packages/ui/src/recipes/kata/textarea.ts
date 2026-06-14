import type { VariantProps } from '../../core/recipe'
import { bridge } from '../katakana'
import { kokkaku, sen } from '../kiso'
import { control } from '../kiso/control'

const { textarea } = kokkaku
const { border } = sen

export const k = bridge.control(control, {
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
		frame: [...border.default],
		/** Actions row beneath the textarea. */
		actions: 'flex items-center mt-auto gap-2 pr-2 pb-2',
	},
	defaults: { resize: 'none', autoResize: false },
	skeleton: textarea,
})

/** Recipe variant props for {@link Textarea} — the styling axes its kata exposes (`resize`, `autoResize`), for consumers composing custom slots. */
export type TextareaVariants = VariantProps<typeof k>
