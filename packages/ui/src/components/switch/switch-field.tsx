'use client'

import { type ComponentPropsWithoutRef, useMemo } from 'react'
import { cn } from '../../core'
import { useIdScope } from '../../hooks/use-id-scope'
import { k, type SwitchFieldVariants } from '../../recipes/kata/switch'
import { type ControlContextValue, ControlProvider, useControl } from '../control/context'

export type SwitchFieldProps = SwitchFieldVariants & {
	className?: string
	htmlFor?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

/**
 * Pairs a Switch with its Label. Generates a scoped id and broadcasts it
 * through `ControlProvider` so the inner Switch and Label auto-wire without
 * the consumer touching `id` / `htmlFor`. Pass `htmlFor` to pin the id.
 */
export function SwitchField({ className, htmlFor, size, ...props }: SwitchFieldProps) {
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
			<div data-slot="field" className={cn(k.field({ size }), k.disabled, className)} {...props} />
		</ControlProvider>
	)
}
