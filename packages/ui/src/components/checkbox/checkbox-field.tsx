'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { ToggleField } from '../../primitives/toggle'
import { k } from '../../recipes/kata/checkbox'
import { ControlField } from '../control/control-field'

export type CheckboxFieldProps = {
	htmlFor?: string
} & ComponentPropsWithoutRef<'div'>

/**
 * Pairs a Checkbox with its Label. Generates a scoped id and broadcasts it
 * through `ControlContext` so the inner Checkbox and Label auto-wire without
 * the consumer touching `id` / `htmlFor`. Pass `htmlFor` to pin the id.
 */
export function CheckboxField({ className, htmlFor, ...props }: CheckboxFieldProps) {
	return (
		<ControlField htmlFor={htmlFor}>
			<ToggleField className={cn(k.disabled, className)} {...props} />
		</ControlField>
	)
}
