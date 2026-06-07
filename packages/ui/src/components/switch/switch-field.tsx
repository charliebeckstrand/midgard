'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k, type SwitchFieldVariants } from '../../recipes/kata/switch'
import { ControlField } from '../control/control-field'

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
	return (
		<ControlField htmlFor={htmlFor}>
			<div data-slot="field" className={cn(k.field({ size }), k.disabled, className)} {...props} />
		</ControlField>
	)
}
