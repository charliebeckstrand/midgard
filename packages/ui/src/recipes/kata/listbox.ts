import { tv, type VariantProps } from 'tailwind-variants'
import { sawari } from '../ryu/sawari'
import { control } from '../waku/control'

export const listbox = tv({
	base: [
		'flex items-center',
		'w-full',
		'text-left',
		...control.field,
		'rounded-lg',
		'appearance-none',
		...sawari.cursor,
	],
	variants: {
		size: control.size,
	},
	defaultVariants: { size: 'md' },
})

export const slots = {
	options: 'max-h-60',
	panel: 'relative min-w-full',
	value: 'flex-1 min-w-0 truncate',
}

export type ListboxVariants = VariantProps<typeof listbox>

export { listbox as listboxVariants, slots as k }
