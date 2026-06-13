'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { ToggleField } from '../../primitives/toggle'
import { k } from '../../recipes/kata/radio'
import { ControlField } from '../control/control-field'

/** Props for {@link RadioField}: native `<div>` attributes plus an optional `htmlFor` to pin the generated id. */
export type RadioFieldProps = {
	htmlFor?: string
} & ComponentPropsWithoutRef<'div'>

/**
 * Pairs a Radio with its Label. Generates a scoped id and broadcasts it
 * through `ControlContext`; the inner Radio and Label auto-wire without
 * the consumer touching `id` / `htmlFor`. Pass `htmlFor` to pin the id.
 */
export function RadioField({ className, htmlFor, ...props }: RadioFieldProps) {
	return (
		<ControlField htmlFor={htmlFor}>
			<ToggleField className={cn(k.disabled, className)} {...props} />
		</ControlField>
	)
}
