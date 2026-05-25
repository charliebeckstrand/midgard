'use client'

import { type ComponentPropsWithoutRef, useMemo } from 'react'
import { cn } from '../../core'
import { useIdScope } from '../../hooks/use-id-scope'
import { ToggleField } from '../../primitives/toggle'
import { k } from '../../recipes/kata/radio'
import { type ControlContextValue, ControlProvider, useControl } from '../control/context'

export type RadioFieldProps = {
	htmlFor?: string
} & ComponentPropsWithoutRef<'div'>

/**
 * Pairs a Radio with its Label. Generates a scoped id and broadcasts it
 * through `ControlProvider` so the inner Radio and Label auto-wire without
 * the consumer touching `id` / `htmlFor`. Pass `htmlFor` to pin the id.
 */
export function RadioField({ className, htmlFor, ...props }: RadioFieldProps) {
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
		<ControlProvider value={value}>
			<ToggleField className={cn(k.disabled, className)} {...props} />
		</ControlProvider>
	)
}
