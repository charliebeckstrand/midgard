'use client'

import { type ComponentPropsWithoutRef, useMemo } from 'react'
import { cn } from '../../core'
import { useIdScope } from '../../hooks/use-id-scope'
import { ToggleField } from '../../primitives/toggle'
import { k } from '../../recipes/kata/checkbox'
import { ControlContext, type ControlContextValue, useControl } from '../control/context'

export type CheckboxFieldProps = {
	htmlFor?: string
} & ComponentPropsWithoutRef<'div'>

/**
 * Pairs a Checkbox with its Label. Generates a scoped id and broadcasts it
 * through `ControlContext` so the inner Checkbox and Label auto-wire without
 * the consumer touching `id` / `htmlFor`. Pass `htmlFor` to pin the id.
 */
export function CheckboxField({ className, htmlFor, ...props }: CheckboxFieldProps) {
	const parent = useControl()

	const scope = useIdScope({ id: htmlFor })

	const value = useMemo<ControlContextValue>(
		() => ({
			id: scope.id,
			autoComplete: parent?.autoComplete,
			disabled: parent?.disabled,
			invalid: parent?.invalid,
			readOnly: parent?.readOnly,
			required: parent?.required,
			size: parent?.size,
			variant: parent?.variant,
		}),
		[scope.id, parent],
	)

	return (
		<ControlContext value={value}>
			<ToggleField className={cn(k.disabled, className)} {...props} />
		</ControlContext>
	)
}
