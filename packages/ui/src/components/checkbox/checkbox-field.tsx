'use client'

import { type ComponentPropsWithoutRef, useMemo } from 'react'
import { cn } from '../../core'
import { useIdScope } from '../../hooks/use-id-scope'
import { ToggleField } from '../../primitives/toggle'
import { k } from '../../recipes/kata/checkbox'
import { ControlContext, type ControlContextValue, useControl } from '../control/context'
import { useControlA11y } from '../control/use-control-a11y'

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

	const a11y = useControlA11y(scope.id)

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
			describedBy: a11y.describedBy,
			descriptionId: a11y.descriptionId,
			messageId: a11y.messageId,
			registerDescription: a11y.registerDescription,
			registerMessage: a11y.registerMessage,
		}),
		[
			scope.id,
			parent,
			a11y.describedBy,
			a11y.descriptionId,
			a11y.messageId,
			a11y.registerDescription,
			a11y.registerMessage,
		],
	)

	return (
		<ControlContext value={value}>
			<ToggleField className={cn(k.disabled, className)} {...props} />
		</ControlContext>
	)
}
