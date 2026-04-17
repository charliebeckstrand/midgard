'use client'

import { cn } from '../../core'
import { ToggleField } from '../../primitives'
import { k } from './variants'

export type RadioFieldProps = React.ComponentPropsWithoutRef<'div'>

export function RadioField({ className, ...props }: RadioFieldProps) {
	return <ToggleField className={cn(k.disabled, className)} {...props} />
}
