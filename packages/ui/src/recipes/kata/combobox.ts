import { tv, type VariantProps } from 'tailwind-variants'
import { iro } from '../ryu/iro'
import { ji } from '../ryu/ji'
import { control } from '../waku/control'

export const combobox = tv({
	base: ['block', 'truncate', ...control.field, 'rounded-lg'],
	variants: {
		density: control.density,
		size: control.size,
	},
	defaultVariants: { density: 'md', size: 'md' },
})

export const slots = {
	options: 'max-h-60',
	empty: ['hidden only:block', 'p-2', ji.size.sm, iro.text.muted],
}

export type ComboboxVariants = VariantProps<typeof combobox>

export { combobox as comboboxVariants, slots as k }
