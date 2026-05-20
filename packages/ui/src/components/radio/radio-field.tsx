import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { ToggleField } from '../../primitives/toggle'
import { disabled } from '../../recipes/kata/radio'

export type RadioFieldProps = ComponentPropsWithoutRef<'div'>

export function RadioField({ className, ...props }: RadioFieldProps) {
	return <ToggleField className={cn(disabled, className)} {...props} />
}
