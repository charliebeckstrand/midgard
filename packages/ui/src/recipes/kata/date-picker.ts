import { tv, type VariantProps } from 'tailwind-variants'
import { iro } from '../ryu/iro'
import { sawari } from '../ryu/sawari'
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
		size: control.size,
	},
	defaultVariants: { size: 'md' },
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

export const datePicker = {
	control: {
		default: control.surface.default,
		glass: [],
	},
	button: datePickerButton,
	value: datePickerValue,
	icon: ['flex items-center', 'pointer-events-none', iro.text.muted],
}

export { datePicker as k, datePickerButton as datePickerButtonVariants }
