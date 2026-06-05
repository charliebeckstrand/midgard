'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { useIdScope } from '../../hooks/use-id-scope'
import { ToggleField } from '../../primitives/toggle'
import { k } from '../../recipes/kata/radio'
import { ControlContext } from '../control/context'
import { useControlFieldContext } from '../control/use-control-field-context'

export type RadioFieldProps = {
	htmlFor?: string
} & ComponentPropsWithoutRef<'div'>

/**
 * Pairs a Radio with its Label. Generates a scoped id and broadcasts it
 * through `ControlContext` so the inner Radio and Label auto-wire without
 * the consumer touching `id` / `htmlFor`. Pass `htmlFor` to pin the id.
 */
export function RadioField({ className, htmlFor, ...props }: RadioFieldProps) {
	const scope = useIdScope({ id: htmlFor })

	const value = useControlFieldContext(scope.id)

	return (
		<ControlContext value={value}>
			<ToggleField className={cn(k.disabled, className)} {...props} />
		</ControlContext>
	)
}
