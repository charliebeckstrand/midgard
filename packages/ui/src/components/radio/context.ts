'use client'

import { createContext } from '../../core/create-context'

export interface RadioGroupContextValue {
	value: string | undefined
	onChange: (value: string) => void
	disabled?: boolean
}

export const [RadioGroupProvider, useRadioGroup] =
	createContext<RadioGroupContextValue>('RadioGroup')
