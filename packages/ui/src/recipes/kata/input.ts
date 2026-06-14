import type { VariantProps } from '../../core/recipe'
import { bridge } from '../katakana'
import { iro } from '../kiso'
import { control } from '../kiso/control'

const { text } = iro

export const k = bridge.control(control, {
	base: 'block',
	slots: {
		/** ControlFrame layout when a prefix/suffix affix is present. */
		frame: 'group/control flex flex-wrap items-center',
		affix: ['flex items-center min-w-0', '*:data-[slot=icon]:pointer-events-none', ...text.muted],
	},
})

export type InputVariants = VariantProps<typeof k>
