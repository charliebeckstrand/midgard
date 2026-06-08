'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { ToggleField } from '../../primitives/toggle'
import { k } from '../../recipes/kata/radio'
import { ControlField } from '../control/control-field'

export type RadioFieldProps = {
	htmlFor?: string
} & ComponentPropsWithoutRef<'div'>

/**
 * Pairs a Radio with its Label. Generates a scoped id and broadcasts it
 * through `ControlContext` so the inner Radio and Label auto-wire without
 * the consumer touching `id` / `htmlFor`. Pass `htmlFor` to pin the id.
 */
export function RadioField({ className, htmlFor, ...props }: RadioFieldProps) {
	return (
		<ControlField htmlFor={htmlFor}>
			<ToggleField className={cn(k.disabled, className)} {...props} />
		</ControlField>
	)
}
