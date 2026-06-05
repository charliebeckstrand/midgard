'use client'

import { type ComponentPropsWithoutRef, useMemo } from 'react'
import { cn } from '../../core'
import { useIdScope } from '../../hooks/use-id-scope'
import { k, type SwitchFieldVariants } from '../../recipes/kata/switch'
import { ControlContext, type ControlContextValue, useControl } from '../control/context'
import { useControlA11y } from '../control/use-control-a11y'

export type SwitchFieldProps = SwitchFieldVariants & {
	className?: string
	htmlFor?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

/**
 * Pairs a Switch with its Label. Generates a scoped id and broadcasts it
 * through `ControlContext` so the inner Switch and Label auto-wire without
 * the consumer touching `id` / `htmlFor`. Pass `htmlFor` to pin the id.
 */
export function SwitchField({ className, htmlFor, size, ...props }: SwitchFieldProps) {
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
			<div data-slot="field" className={cn(k.field({ size }), k.disabled, className)} {...props} />
		</ControlContext>
	)
}
