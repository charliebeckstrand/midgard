'use client'

import { cn } from '../../core'
import { k } from './variants'

export type FieldsetProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'fieldset'>, 'className'>

export function Fieldset({ className, ...props }: FieldsetProps) {
	return <fieldset data-slot="fieldset" className={cn(k.base, className)} {...props} />
}
