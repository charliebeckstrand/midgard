import { tv, type VariantProps } from 'tailwind-variants'
import { sawari } from '../../core/recipe'
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
		density: control.density,
		size: control.size,
	},
	defaultVariants: { density: 'md', size: 'md' },
})

const value = tv({
	base: [],
	variants: {
		truncate: {
			true: 'flex-1 min-w-0 truncate',
			false: '',
		},
	},
	defaultVariants: { truncate: true },
})

export const k = {
	options: 'max-h-60',
	panel: 'relative min-w-full',
	value,
}

export type ListboxVariants = VariantProps<typeof listbox>

export { listbox as listboxVariants }
