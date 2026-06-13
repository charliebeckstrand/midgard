'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/switch'
import { ControlField } from '../control/control-field'

/** Props for {@link SwitchField}: an optional `htmlFor` to pin the shared id, plus `<div>` attributes. */
export type SwitchFieldProps = {
	className?: string
	htmlFor?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

/**
 * Pairs a Switch with its Label. Generates a scoped id and broadcasts it
 * through `ControlContext`; the inner Switch and Label auto-wire without
 * the consumer touching `id` / `htmlFor`. Pass `htmlFor` to pin the id.
 */
export function SwitchField({ className, htmlFor, ...props }: SwitchFieldProps) {
	return (
		<ControlField htmlFor={htmlFor}>
			<div data-slot="field" className={cn(k.field(), k.disabled, className)} {...props} />
		</ControlField>
	)
}
