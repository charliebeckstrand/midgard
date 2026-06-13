'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { ToggleField } from '../../primitives/toggle'
import { k } from '../../recipes/kata/checkbox'
import { ControlField } from '../control/control-field'

/** Props for {@link CheckboxField}. */
export type CheckboxFieldProps = {
	/** Pins the generated control id instead of auto-generating one. */
	htmlFor?: string
} & ComponentPropsWithoutRef<'div'>

/**
 * Pairs a Checkbox with its Label. Generates a scoped id and broadcasts it
 * through `ControlContext`; the inner Checkbox and Label auto-wire without
 * the consumer touching `id` / `htmlFor`. Pass `htmlFor` to pin the id.
 */
export function CheckboxField({ className, htmlFor, ...props }: CheckboxFieldProps) {
	return (
		<ControlField htmlFor={htmlFor}>
			<ToggleField className={cn(k.disabled, className)} {...props} />
		</ControlField>
	)
}
