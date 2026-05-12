import type { Placement } from '@floating-ui/react'

export type DatePickerSingleProps = {
	range?: false
	value?: Date
	defaultValue?: Date
	onChange?: (value: Date | undefined) => void
}

export type DatePickerRangeProps = {
	range: true
	value?: [Date, Date]
	defaultValue?: [Date, Date]
	onChange?: (value: [Date, Date] | undefined) => void
}

export type DatePickerBaseProps = {
	min?: Date
	max?: Date
	placeholder?: string
	placement?: Placement
	className?: string
	disabled?: boolean
}

export type DatePickerProps = DatePickerBaseProps & (DatePickerSingleProps | DatePickerRangeProps)
