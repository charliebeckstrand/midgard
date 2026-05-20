import { tv, type VariantProps } from 'tailwind-variants'
import { iro, sawari } from '../../core/recipe'
import { control } from '../waku/control'

const datePickerButton = tv({
	base: [
		'flex items-center justify-between',
		...control.field,
		'text-left',
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

const datePickerValue = tv({
	base: ['block'],
	variants: {
		truncate: {
			true: 'truncate',
			false: '',
		},
	},
	defaultVariants: { truncate: true },
})

export type DatePickerButtonVariants = VariantProps<typeof datePickerButton>

export const k = {
	control: {
		default: control.surface.default,
		glass: [],
	},
	button: datePickerButton,
	value: datePickerValue,
	icon: ['flex items-center', 'pointer-events-none', iro.text.muted],
}

export { datePickerButton as datePickerButtonVariants }
