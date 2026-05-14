import { tv, type VariantProps } from 'tailwind-variants'
import { iro } from '../ryu/iro'
import { sawari } from '../ryu/sawari'
import { control } from '../waku/control'

const datepickerButton = tv({
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

const datepickerValue = tv({
	base: ['block'],
	variants: {
		truncate: {
			true: 'truncate',
			false: '',
		},
	},
	defaultVariants: { truncate: true },
})

export type DatepickerButtonVariants = VariantProps<typeof datepickerButton>

export const datepicker = {
	control: {
		default: control.surface.default,
		glass: [],
	},
	button: datepickerButton,
	value: datepickerValue,
	icon: ['flex items-center', 'pointer-events-none', iro.text.muted],
}

export { datepicker as k, datepickerButton as datepickerButtonVariants }
