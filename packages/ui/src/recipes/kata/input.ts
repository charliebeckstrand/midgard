import type { VariantProps } from '../../core/recipe'
import { katakana } from '../katakana'
import { iro } from '../kiso'
import { control } from '../kiso/control'

const { text } = iro

export const k = katakana.control(control, {
	base: 'block',
	slots: {
		affix: ['flex items-center min-w-0', '*:data-[slot=icon]:pointer-events-none', ...text.muted],
	},
})

export type InputVariants = VariantProps<typeof k>
