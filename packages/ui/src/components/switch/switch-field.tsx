'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { useIdScope } from '../../hooks/use-id-scope'
import { k, type SwitchFieldVariants } from '../../recipes/kata/switch'
import { ControlContext } from '../control/context'
import { useControlFieldContext } from '../control/use-control-field-context'

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
	const scope = useIdScope({ id: htmlFor })

	const value = useControlFieldContext(scope.id)

	return (
		<ControlContext value={value}>
			<div data-slot="field" className={cn(k.field({ size }), k.disabled, className)} {...props} />
		</ControlContext>
	)
}
