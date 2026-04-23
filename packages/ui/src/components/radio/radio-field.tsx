import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { ToggleField } from '../../primitives'
import { k } from './variants'

export type RadioFieldProps = ComponentPropsWithoutRef<'div'>

export function RadioField({ className, ...props }: RadioFieldProps) {
	return <ToggleField className={cn(k.disabled, className)} {...props} />
}
